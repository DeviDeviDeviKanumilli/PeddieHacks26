import { randomUUID } from 'node:crypto';
import type {
  ExerciseAnalysis,
  ExerciseProgressResponse,
  ExerciseSession,
  MetricBatchRequest,
  MetricBatchResponse,
  PatchExerciseSessionRequest,
  PatchWorkoutSessionRequest,
  ProgressSummary,
  RepMetric,
  Workout,
  WorkoutSession,
} from '@peddie/contracts';
import {
  analyzeExerciseSession,
  compareProgress,
  type ExerciseSessionState as DomainExerciseSessionState,
  type RepMetric as DomainRepMetric,
  type WorkoutSessionState as DomainWorkoutSessionState,
  transitionExerciseSession,
  transitionWorkoutSession,
  validateMetricBatch,
} from '@peddie/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogRepository } from './catalog-repository.js';
import { ApiError } from './errors.js';
import type { SupabaseClientFactory } from './supabase-client.js';
import { hashRequest } from './workout-repository.js';

// session storage + domain transitions. derived metrics only — never pose frames or landmarks.

export interface SessionListResult {
  readonly data: readonly WorkoutSession[];
  readonly page: { readonly nextCursor: string | null; readonly hasMore: boolean };
}

export interface ProgressActivityRow {
  readonly activityDate: string;
  readonly sessionCount: number;
  readonly exerciseCount: number;
  readonly setCount: number;
  readonly repCount: number;
  readonly activeSeconds: number;
  readonly averageScore: number | null;
}

export interface SessionRepository {
  createWorkoutSession(input: {
    readonly userId: string;
    readonly workout: Workout;
    readonly clientRequestId: string;
    readonly accessToken?: string;
  }): Promise<WorkoutSession>;
  listWorkoutSessions(
    userId: string,
    limit: number,
    cursor?: string,
    accessToken?: string,
  ): Promise<SessionListResult>;
  getWorkoutSession(
    userId: string,
    sessionId: string,
    accessToken?: string,
  ): Promise<WorkoutSession | null>;
  patchWorkoutSession(
    userId: string,
    sessionId: string,
    request: PatchWorkoutSessionRequest,
    accessToken?: string,
  ): Promise<WorkoutSession>;
  completeWorkoutSession(
    userId: string,
    sessionId: string,
    expectedVersion: number,
    endReason?: string,
    accessToken?: string,
  ): Promise<WorkoutSession>;
  deleteWorkoutSession(userId: string, sessionId: string, accessToken?: string): Promise<void>;
  listExerciseSessions(
    userId: string,
    workoutSessionId: string,
    accessToken?: string,
  ): Promise<readonly ExerciseSession[]>;
  getExerciseSession(
    userId: string,
    sessionId: string,
    accessToken?: string,
  ): Promise<ExerciseSession | null>;
  patchExerciseSession(
    userId: string,
    sessionId: string,
    request: PatchExerciseSessionRequest,
    accessToken?: string,
  ): Promise<ExerciseSession>;
  ingestMetricBatch(
    userId: string,
    sessionId: string,
    batch: MetricBatchRequest,
    accessToken?: string,
  ): Promise<MetricBatchResponse['data']>;
  completeExerciseSession(
    userId: string,
    sessionId: string,
    expectedVersion: number,
    accessToken?: string,
  ): Promise<ExerciseAnalysis>;
  getExerciseAnalysis(
    userId: string,
    sessionId: string,
    accessToken?: string,
  ): Promise<ExerciseAnalysis>;
  getProgressSummary(userId: string, accessToken?: string): Promise<ProgressSummary>;
  listProgressActivity(
    userId: string,
    startDate: string,
    endDate: string,
    limit: number,
    cursor?: string,
    accessToken?: string,
  ): Promise<{
    readonly data: readonly ProgressActivityRow[];
    readonly page: { readonly nextCursor: string | null; readonly hasMore: boolean };
  }>;
  getExerciseProgress(
    userId: string,
    exerciseId: string,
    accessToken?: string,
  ): Promise<ExerciseProgressResponse['data']>;
}

const dependencyError = (detail: string): ApiError =>
  new ApiError({
    statusCode: 503,
    code: 'session_dependency_unavailable',
    title: 'Session data unavailable',
    detail,
  });

const notFound = (resource: string): ApiError =>
  new ApiError({
    statusCode: 404,
    code: `${resource}_not_found`,
    title: `${resource.replaceAll('_', ' ')} not found`,
    detail: `The requested ${resource.replaceAll('_', ' ')} is not available.`,
  });

const conflict = (code: string, title: string, detail: string): ApiError =>
  new ApiError({ statusCode: 409, code, title, detail });

const invalidSession = (detail: string): ApiError =>
  new ApiError({
    statusCode: 422,
    code: 'invalid_session_operation',
    title: 'Invalid session operation',
    detail,
  });

const validateBatch = (batch: MetricBatchRequest): void => {
  try {
    // domain rejects unknown keys and out-of-range scores. keep that out of the handler.
    validateMetricBatch(batch);
  } catch (error) {
    throw new ApiError({
      statusCode: 422,
      code: error instanceof Error && 'code' in error ? String(error.code) : 'invalid_metric_batch',
      title: 'Invalid metric batch',
      detail: error instanceof Error ? error.message : 'The metric batch is invalid.',
    });
  }
};

const now = (): string => new Date().toISOString();

const encodeCursor = (startedAt: string, id: string): string =>
  Buffer.from(JSON.stringify({ startedAt, id }), 'utf8').toString('base64url');

const decodeCursor = (value: string): { readonly startedAt: string; readonly id: string } => {
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('startedAt' in decoded) ||
      !('id' in decoded) ||
      typeof decoded.startedAt !== 'string' ||
      typeof decoded.id !== 'string'
    ) {
      throw new Error('invalid');
    }
    return { startedAt: decoded.startedAt, id: decoded.id };
  } catch {
    throw new ApiError({
      statusCode: 400,
      code: 'invalid_cursor',
      title: 'Invalid cursor',
      detail: 'The pagination cursor is invalid or expired.',
    });
  }
};

const metricKey = (sessionId: string, metric: RepMetric): string =>
  `${sessionId}:${metric.setNumber}:${metric.repNumber}`;

const targetRepsFor = (sets: number, reps: number | undefined): number =>
  reps === undefined ? 0 : sets * reps;

type SessionTarget = {
  readonly sets: number;
  readonly reps?: number;
  readonly holdSeconds?: number;
  readonly rangeOfMotionTarget?: { readonly minDeg: number; readonly maxDeg: number };
  readonly tempoTarget?: { readonly minSeconds: number; readonly maxSeconds: number };
};

type StoredWorkoutSession = { readonly userId: string; session: WorkoutSession };
type StoredExerciseSession = {
  readonly userId: string;
  session: ExerciseSession;
  target: SessionTarget;
};

const exerciseState = (state: ExerciseSession['state']): DomainExerciseSessionState => state;
const workoutState = (state: WorkoutSession['state']): DomainWorkoutSessionState => state;
const domainMetrics = (metrics: readonly RepMetric[]): readonly DomainRepMetric[] => metrics;

// in-memory twin of the sql rpcs so route tests do not need postgres.
export class MemorySessionRepository implements SessionRepository {
  private readonly workoutSessions = new Map<string, StoredWorkoutSession>();
  private readonly sessionClientIds = new Map<string, string>();
  private readonly exerciseSessions = new Map<string, StoredExerciseSession>();
  private readonly metrics = new Map<string, Map<string, RepMetric>>();
  private readonly batches = new Map<
    string,
    { readonly requestHash: string; readonly count: number }
  >();
  private readonly analyses = new Map<string, ExerciseAnalysis>();

  constructor(private readonly catalog?: CatalogRepository) {}

  async createWorkoutSession(input: {
    readonly userId: string;
    readonly workout: Workout;
    readonly clientRequestId: string;
    readonly accessToken?: string;
  }): Promise<WorkoutSession> {
    const clientKey = `${input.userId}:${input.clientRequestId}`;
    const existingId = this.sessionClientIds.get(clientKey);
    if (existingId !== undefined) {
      const existing = this.workoutSessions.get(existingId);
      if (existing === undefined) throw new Error('Session idempotency index is inconsistent.');
      return existing.session;
    }
    const timestamp = now();
    const session: WorkoutSession = {
      id: randomUUID(),
      workoutId: input.workout.id,
      state: 'active',
      startedAt: timestamp,
      endedAt: null,
      durationSeconds: null,
      version: 1,
    };
    this.workoutSessions.set(session.id, { userId: input.userId, session });
    this.sessionClientIds.set(clientKey, session.id);
    for (const item of input.workout.items) {
      const exerciseSession: ExerciseSession = {
        id: randomUUID(),
        workoutSessionId: session.id,
        workoutItemId: item.id,
        exerciseId: item.exerciseId,
        state: 'pending',
        targetReps: targetRepsFor(item.sets, item.reps),
        targetSets: item.sets,
        completedReps: 0,
        completedSets: 0,
        startedAt: null,
        endedAt: null,
        version: 1,
      };
      const target: SessionTarget = {
        sets: item.sets,
        ...(item.reps === undefined ? {} : { reps: item.reps }),
        ...(item.holdSeconds === undefined ? {} : { holdSeconds: item.holdSeconds }),
      };
      this.exerciseSessions.set(exerciseSession.id, {
        userId: input.userId,
        session: exerciseSession,
        target,
      });
    }
    return session;
  }

  async listWorkoutSessions(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<SessionListResult> {
    let rows = [...this.workoutSessions.values()]
      .filter((row) => row.userId === userId)
      .sort((left, right) => {
        const started = right.session.startedAt.localeCompare(left.session.startedAt);
        return started === 0 ? right.session.id.localeCompare(left.session.id) : started;
      });
    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      const index = rows.findIndex(
        (row) => row.session.startedAt === decoded.startedAt && row.session.id === decoded.id,
      );
      if (index < 0)
        throw new ApiError({
          statusCode: 400,
          code: 'invalid_cursor',
          title: 'Invalid cursor',
          detail: 'The cursor does not belong to this collection.',
        });
      rows = rows.slice(index + 1);
    }
    const pageRows = rows.slice(0, limit);
    const hasMore = rows.length > pageRows.length;
    const last = pageRows.at(-1)?.session;
    return {
      data: pageRows.map((row) => row.session),
      page: {
        hasMore,
        nextCursor: hasMore && last !== undefined ? encodeCursor(last.startedAt, last.id) : null,
      },
    };
  }

  async getWorkoutSession(userId: string, sessionId: string): Promise<WorkoutSession | null> {
    const row = this.workoutSessions.get(sessionId);
    return row === undefined || row.userId !== userId ? null : row.session;
  }

  async patchWorkoutSession(
    userId: string,
    sessionId: string,
    request: PatchWorkoutSessionRequest,
  ): Promise<WorkoutSession> {
    const row = this.workoutSessions.get(sessionId);
    if (row === undefined || row.userId !== userId) throw notFound('workout_session');
    if (row.session.version !== request.expectedVersion) {
      throw conflict(
        'version_conflict',
        'Version conflict',
        'The workout session changed since it was loaded.',
      );
    }
    if (request.state === undefined) return row.session;
    // complete has side effects (progress rebuild). do not sneak it through patch.
    if (request.state === 'completed') {
      throw invalidSession('Use the completion endpoint to complete a workout session.');
    }
    let nextState: DomainWorkoutSessionState;
    try {
      nextState = transitionWorkoutSession(workoutState(row.session.state), request.state);
    } catch (error) {
      throw conflict(
        'invalid_state_transition',
        'Invalid state transition',
        error instanceof Error ? error.message : 'The state transition is not allowed.',
      );
    }
    const terminal = nextState === 'cancelled';
    const endedAt = terminal ? now() : null;
    const durationSeconds =
      endedAt === null
        ? null
        : Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(row.session.startedAt)) / 1000));
    const next: WorkoutSession = {
      ...row.session,
      state: nextState,
      endedAt,
      durationSeconds,
      version: row.session.version + 1,
    };
    this.workoutSessions.set(sessionId, { ...row, session: next });
    return next;
  }

  async completeWorkoutSession(
    userId: string,
    sessionId: string,
    expectedVersion: number,
    _endReason?: string,
  ): Promise<WorkoutSession> {
    const row = this.workoutSessions.get(sessionId);
    if (row === undefined || row.userId !== userId) throw notFound('workout_session');
    if (row.session.state === 'completed') return row.session;
    if (row.session.version !== expectedVersion) {
      throw conflict(
        'version_conflict',
        'Version conflict',
        'The workout session changed since it was loaded.',
      );
    }
    const children = [...this.exerciseSessions.values()].filter(
      (child) => child.userId === userId && child.session.workoutSessionId === sessionId,
    );
    if (
      children.some((child) => !['completed', 'cancelled', 'skipped'].includes(child.session.state))
    ) {
      throw invalidSession(
        'Complete, cancel, or skip every exercise before completing the workout.',
      );
    }
    let nextState: DomainWorkoutSessionState;
    try {
      nextState = transitionWorkoutSession(workoutState(row.session.state), 'completed');
    } catch (error) {
      throw conflict(
        'invalid_state_transition',
        'Invalid state transition',
        error instanceof Error ? error.message : 'The state transition is not allowed.',
      );
    }
    const endedAt = now();
    const next: WorkoutSession = {
      ...row.session,
      state: nextState,
      endedAt,
      durationSeconds: Math.max(
        0,
        Math.round((Date.parse(endedAt) - Date.parse(row.session.startedAt)) / 1000),
      ),
      version: row.session.version + 1,
    };
    this.workoutSessions.set(sessionId, { ...row, session: next });
    return next;
  }

  async deleteWorkoutSession(userId: string, sessionId: string): Promise<void> {
    const row = this.workoutSessions.get(sessionId);
    if (row === undefined || row.userId !== userId) return;
    this.workoutSessions.delete(sessionId);
    for (const [id, child] of this.exerciseSessions) {
      if (child.session.workoutSessionId === sessionId) {
        this.exerciseSessions.delete(id);
        this.metrics.delete(id);
        this.analyses.delete(id);
        for (const batchKey of this.batches.keys()) {
          if (batchKey.startsWith(`${id}:`)) this.batches.delete(batchKey);
        }
      }
    }
    for (const [key, value] of this.sessionClientIds) {
      if (value === sessionId) this.sessionClientIds.delete(key);
    }
  }

  async listExerciseSessions(
    userId: string,
    workoutSessionId: string,
  ): Promise<readonly ExerciseSession[]> {
    const parent = await this.getWorkoutSession(userId, workoutSessionId);
    if (parent === null) throw notFound('workout_session');
    return [...this.exerciseSessions.values()]
      .filter((row) => row.userId === userId && row.session.workoutSessionId === workoutSessionId)
      .sort(
        (left, right) =>
          left.session.workoutItemId?.localeCompare(right.session.workoutItemId ?? '') ?? 0,
      )
      .map((row) => row.session);
  }

  async getExerciseSession(userId: string, sessionId: string): Promise<ExerciseSession | null> {
    const row = this.exerciseSessions.get(sessionId);
    return row === undefined || row.userId !== userId ? null : row.session;
  }

  async patchExerciseSession(
    userId: string,
    sessionId: string,
    request: PatchExerciseSessionRequest,
  ): Promise<ExerciseSession> {
    const row = this.exerciseSessions.get(sessionId);
    if (row === undefined || row.userId !== userId) throw notFound('exercise_session');
    if (row.session.version !== request.expectedVersion) {
      throw conflict(
        'version_conflict',
        'Version conflict',
        'The exercise session changed since it was loaded.',
      );
    }
    if (request.state === undefined) return row.session;
    if (request.state === 'completed') {
      throw invalidSession('Use the completion endpoint to save the exercise analysis.');
    }
    let nextState: DomainExerciseSessionState;
    try {
      nextState = transitionExerciseSession(exerciseState(row.session.state), request.state);
    } catch (error) {
      throw conflict(
        'invalid_state_transition',
        'Invalid state transition',
        error instanceof Error ? error.message : 'The state transition is not allowed.',
      );
    }
    const startedAt =
      nextState === 'active' && row.session.startedAt === null ? now() : row.session.startedAt;
    const terminal = ['cancelled', 'skipped'].includes(nextState);
    const next: ExerciseSession = {
      ...row.session,
      state: nextState,
      startedAt,
      endedAt: terminal ? now() : null,
      version: row.session.version + 1,
    };
    this.exerciseSessions.set(sessionId, { ...row, session: next });
    return next;
  }

  async ingestMetricBatch(
    userId: string,
    sessionId: string,
    batch: MetricBatchRequest,
  ): Promise<MetricBatchResponse['data']> {
    const row = this.exerciseSessions.get(sessionId);
    if (row === undefined || row.userId !== userId) throw notFound('exercise_session');
    if (!['active', 'paused', 'resting'].includes(row.session.state)) {
      throw invalidSession('Metrics can only be submitted while an exercise session is open.');
    }
    // allowlisted derived scores only. raw landmarks never reach this map.
    validateBatch(batch);
    const batchKey = `${sessionId}:${batch.batchId}`;
    const requestHash = hashRequest(batch);
    const existingBatch = this.batches.get(batchKey);
    if (existingBatch !== undefined) {
      if (existingBatch.requestHash !== requestHash) {
        throw conflict(
          'idempotency_conflict',
          'Idempotency conflict',
          'The metric batch ID was already used with different content.',
        );
      }
      return { acceptedCount: 0, duplicateCount: existingBatch.count, rejectedCount: 0 };
    }
    this.batches.set(batchKey, { requestHash, count: batch.metrics.length });
    const metrics = this.metrics.get(sessionId) ?? new Map<string, RepMetric>();
    let acceptedCount = 0;
    let duplicateCount = 0;
    for (const metric of batch.metrics) {
      const key = metricKey(sessionId, metric);
      if (metrics.has(key)) duplicateCount += 1;
      else {
        metrics.set(key, metric);
        acceptedCount += 1;
      }
    }
    this.metrics.set(sessionId, metrics);
    return { acceptedCount, duplicateCount, rejectedCount: 0 };
  }

  async completeExerciseSession(
    userId: string,
    sessionId: string,
    expectedVersion: number,
  ): Promise<ExerciseAnalysis> {
    const row = this.exerciseSessions.get(sessionId);
    if (row === undefined || row.userId !== userId) throw notFound('exercise_session');
    const existingAnalysis = this.analyses.get(sessionId);
    if (row.session.state === 'completed' && existingAnalysis !== undefined)
      return existingAnalysis;
    if (row.session.version !== expectedVersion) {
      throw conflict(
        'version_conflict',
        'Version conflict',
        'The exercise session changed since it was loaded.',
      );
    }
    if (!['active', 'paused', 'resting'].includes(row.session.state)) {
      throw invalidSession('The exercise session is not open for completion.');
    }
    const metrics = [...(this.metrics.get(sessionId)?.values() ?? [])].sort(
      (left, right) => (left.recordedOffsetMs ?? 0) - (right.recordedOffsetMs ?? 0),
    );
    // scoring stays in domain so memory and sql adapters cannot drift.
    const analysis = analyzeExerciseSession({
      targetReps: row.session.targetReps,
      metrics: domainMetrics(metrics),
      ...(row.target.rangeOfMotionTarget === undefined
        ? {}
        : { romTarget: row.target.rangeOfMotionTarget }),
      ...(row.target.tempoTarget === undefined ? {} : { tempoTarget: row.target.tempoTarget }),
    });
    const countedReps = metrics.filter((metric) => metric.counted).length;
    const completedSets = new Set(
      metrics.filter((metric) => metric.counted).map((metric) => metric.setNumber),
    ).size;
    const endedAt = now();
    const next: ExerciseSession = {
      ...row.session,
      state: 'completed',
      completedReps: countedReps,
      completedSets: Math.min(row.session.targetSets, completedSets),
      startedAt: row.session.startedAt ?? endedAt,
      endedAt,
      version: row.session.version + 1,
    };
    this.exerciseSessions.set(sessionId, { ...row, session: next });
    this.analyses.set(sessionId, analysis);
    return analysis;
  }

  async getExerciseAnalysis(userId: string, sessionId: string): Promise<ExerciseAnalysis> {
    const row = this.exerciseSessions.get(sessionId);
    if (row === undefined || row.userId !== userId) throw notFound('exercise_session');
    const analysis = this.analyses.get(sessionId);
    if (analysis === undefined) {
      throw conflict(
        'analysis_not_ready',
        'Analysis not ready',
        'Complete the exercise session before requesting analysis.',
      );
    }
    return analysis;
  }

  async getProgressSummary(userId: string): Promise<ProgressSummary> {
    const completedSessions = [...this.workoutSessions.values()]
      .filter((row) => row.userId === userId && row.session.state === 'completed')
      .map((row) => row.session);
    const completedExercises = [...this.exerciseSessions.values()].filter(
      (row) => row.userId === userId && row.session.state === 'completed',
    );
    const scores = completedExercises.flatMap((row) => {
      const score = this.analyses.get(row.session.id)?.overallScore;
      return score === null || score === undefined ? [] : [score];
    });
    const coverage = new Map<string, number>();
    if (this.catalog !== undefined) {
      for (const row of completedExercises) {
        const candidate = await this.catalog.getExerciseCandidate(row.session.exerciseId);
        for (const demand of candidate?.bodyDemands ?? []) {
          const intensity = demand.demand === 'high' ? 100 : demand.demand === 'moderate' ? 60 : 25;
          coverage.set(demand.regionId, Math.max(coverage.get(demand.regionId) ?? 0, intensity));
        }
      }
    }
    return {
      totalActiveSeconds: completedSessions.reduce(
        (sum, session) => sum + (session.durationSeconds ?? 0),
        0,
      ),
      totalExercises: completedExercises.length,
      totalSets: completedExercises.reduce((sum, row) => sum + row.session.completedSets, 0),
      totalReps: completedExercises.reduce((sum, row) => sum + row.session.completedReps, 0),
      averageScore:
        scores.length === 0 ? null : scores.reduce((sum, score) => sum + score, 0) / scores.length,
      bodyCoverage: [...coverage.entries()].map(([bodyRegionId, intensity]) => ({
        bodyRegionId,
        intensity,
      })),
    };
  }

  async listProgressActivity(
    userId: string,
    startDate: string,
    endDate: string,
    limit: number,
    cursor?: string,
  ): Promise<{
    readonly data: readonly ProgressActivityRow[];
    readonly page: { readonly nextCursor: string | null; readonly hasMore: boolean };
  }> {
    const aggregate = new Map<string, ProgressActivityRow>();
    for (const row of this.workoutSessions.values()) {
      if (row.userId !== userId || row.session.state !== 'completed') continue;
      const date = row.session.startedAt.slice(0, 10);
      if (date < startDate || date > endDate) continue;
      const children = [...this.exerciseSessions.values()].filter(
        (child) =>
          child.userId === userId &&
          child.session.workoutSessionId === row.session.id &&
          child.session.state === 'completed',
      );
      const scores = children.flatMap((child) => {
        const score = this.analyses.get(child.session.id)?.overallScore;
        return score === null || score === undefined ? [] : [score];
      });
      const existing = aggregate.get(date);
      aggregate.set(date, {
        activityDate: date,
        sessionCount: (existing?.sessionCount ?? 0) + 1,
        exerciseCount: (existing?.exerciseCount ?? 0) + children.length,
        setCount:
          (existing?.setCount ?? 0) +
          children.reduce((sum, child) => sum + child.session.completedSets, 0),
        repCount:
          (existing?.repCount ?? 0) +
          children.reduce((sum, child) => sum + child.session.completedReps, 0),
        activeSeconds: (existing?.activeSeconds ?? 0) + (row.session.durationSeconds ?? 0),
        averageScore:
          scores.length === 0 && existing?.averageScore === undefined
            ? null
            : ((existing?.averageScore ?? 0) +
                (scores.length === 0
                  ? 0
                  : scores.reduce((sum, score) => sum + score, 0) / scores.length)) /
              ((existing === undefined ? 0 : 1) + (scores.length === 0 ? 0 : 1)),
      });
    }
    let rows = [...aggregate.values()].sort((left, right) =>
      right.activityDate.localeCompare(left.activityDate),
    );
    if (cursor !== undefined) {
      const index = rows.findIndex((row) => row.activityDate === cursor);
      if (index < 0)
        throw new ApiError({
          statusCode: 400,
          code: 'invalid_cursor',
          title: 'Invalid cursor',
          detail: 'The cursor does not belong to this collection.',
        });
      rows = rows.slice(index + 1);
    }
    const pageRows = rows.slice(0, limit);
    const hasMore = rows.length > pageRows.length;
    return {
      data: pageRows,
      page: { hasMore, nextCursor: hasMore ? (pageRows.at(-1)?.activityDate ?? null) : null },
    };
  }

  async getExerciseProgress(
    userId: string,
    exerciseId: string,
  ): Promise<ExerciseProgressResponse['data']> {
    const rows = [...this.exerciseSessions.values()]
      .filter(
        (row) =>
          row.userId === userId &&
          row.session.exerciseId === exerciseId &&
          row.session.state === 'completed',
      )
      .sort((left, right) =>
        (right.session.endedAt ?? '').localeCompare(left.session.endedAt ?? ''),
      );
    const scores = rows.flatMap((row) => {
      const score = this.analyses.get(row.session.id)?.overallScore;
      return score === null || score === undefined ? [] : [score];
    });
    const currentScore = scores[0] ?? null;
    const comparison = compareProgress(currentScore, scores.slice(1));
    return {
      exerciseId,
      currentScore,
      baselineScore: comparison?.baselineScore ?? null,
      scoreDelta: comparison?.scoreDelta ?? null,
      relativePercentage: comparison?.relativePercentage ?? null,
    };
  }
}

type Row = Record<string, unknown>;

const rowRecord = (value: unknown): Row =>
  typeof value === 'object' && value !== null ? (value as Row) : {};

const rowString = (row: Row, key: string): string => {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`Session row is missing ${key}.`);
  return value;
};

const rowNumber = (row: Row, key: string): number | null => {
  const value = row[key];
  return typeof value === 'number' ? value : null;
};

const rowStringOrNull = (row: Row, key: string): string | null => {
  const value = row[key];
  return typeof value === 'string' ? value : null;
};

const rowArray = (value: unknown): readonly Row[] =>
  Array.isArray(value) ? value.map(rowRecord) : [];

const isUuid = (value: string): boolean =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value,
  );

const checkedCursor = (value: string): { readonly startedAt: string; readonly id: string } => {
  const cursor = decodeCursor(value);
  if (!isUuid(cursor.id) || Number.isNaN(Date.parse(cursor.startedAt))) {
    throw new ApiError({
      statusCode: 400,
      code: 'invalid_cursor',
      title: 'Invalid cursor',
      detail: 'The pagination cursor is invalid or expired.',
    });
  }
  return cursor;
};

const targetFromRow = (row: Row): SessionTarget => {
  const snapshot = rowRecord(row.target_snapshot);
  const rom = rowRecord(snapshot.rangeOfMotionTarget);
  const tempo = rowRecord(snapshot.tempoTarget);
  return {
    sets: typeof snapshot.sets === 'number' ? snapshot.sets : 1,
    ...(typeof snapshot.reps === 'number' ? { reps: snapshot.reps } : {}),
    ...(typeof snapshot.holdSeconds === 'number' ? { holdSeconds: snapshot.holdSeconds } : {}),
    ...(typeof rom.minDeg === 'number' && typeof rom.maxDeg === 'number'
      ? { rangeOfMotionTarget: { minDeg: rom.minDeg, maxDeg: rom.maxDeg } }
      : {}),
    ...(typeof tempo.minSeconds === 'number' && typeof tempo.maxSeconds === 'number'
      ? { tempoTarget: { minSeconds: tempo.minSeconds, maxSeconds: tempo.maxSeconds } }
      : {}),
  };
};

const mapWorkoutSession = (value: unknown): WorkoutSession => {
  const row = rowRecord(value);
  return {
    id: rowString(row, 'id'),
    workoutId: rowString(row, 'workout_id'),
    state: rowString(row, 'state') as WorkoutSession['state'],
    startedAt: rowString(row, 'started_at'),
    endedAt: rowStringOrNull(row, 'ended_at'),
    durationSeconds: rowNumber(row, 'duration_seconds'),
    version: rowNumber(row, 'version') ?? 1,
  };
};

const mapExerciseSession = (
  value: unknown,
): { readonly session: ExerciseSession; readonly target: SessionTarget } => {
  const row = rowRecord(value);
  const target = targetFromRow(row);
  return {
    target,
    session: {
      id: rowString(row, 'id'),
      workoutSessionId: rowString(row, 'workout_session_id'),
      workoutItemId: typeof row.workout_item_id === 'string' ? row.workout_item_id : null,
      exerciseId: rowString(row, 'exercise_id'),
      state: rowString(row, 'state') as ExerciseSession['state'],
      targetReps: targetRepsFor(target.sets, target.reps),
      targetSets: target.sets,
      completedReps: rowNumber(row, 'completed_reps') ?? 0,
      completedSets: rowNumber(row, 'completed_sets') ?? 0,
      startedAt: rowStringOrNull(row, 'started_at'),
      endedAt: rowStringOrNull(row, 'ended_at'),
      version: rowNumber(row, 'version') ?? 1,
    },
  };
};

const mapMetric = (value: unknown): RepMetric => {
  const row = rowRecord(value);
  const feedbackCodes = Array.isArray(row.feedback_codes)
    ? row.feedback_codes.filter(
        (code): code is RepMetric['feedbackCodes'][number] => typeof code === 'string',
      )
    : [];
  const metric: RepMetric = {
    setNumber: rowNumber(row, 'set_number') ?? 1,
    repNumber: rowNumber(row, 'rep_number') ?? 1,
    counted: row.counted === true,
    feedbackCodes,
  };
  if (rowNumber(row, 'duration_ms') !== null)
    metric.durationMs = rowNumber(row, 'duration_ms') ?? 0;
  if (rowNumber(row, 'range_of_motion_deg') !== null)
    metric.rangeOfMotionDeg = rowNumber(row, 'range_of_motion_deg') ?? 0;
  if (typeof row.target_position_reached === 'boolean')
    metric.targetPositionReached = row.target_position_reached;
  if (rowNumber(row, 'accuracy_score') !== null)
    metric.accuracyScore = rowNumber(row, 'accuracy_score') ?? 0;
  if (rowNumber(row, 'control_score') !== null)
    metric.controlScore = rowNumber(row, 'control_score') ?? 0;
  if (rowNumber(row, 'stability_score') !== null)
    metric.stabilityScore = rowNumber(row, 'stability_score') ?? 0;
  if (rowNumber(row, 'form_score') !== null) metric.formScore = rowNumber(row, 'form_score') ?? 0;
  if (rowNumber(row, 'tracking_confidence') !== null)
    metric.trackingConfidence = rowNumber(row, 'tracking_confidence') ?? 0;
  if (rowNumber(row, 'recorded_offset_ms') !== null)
    metric.recordedOffsetMs = rowNumber(row, 'recorded_offset_ms') ?? 0;
  return metric;
};

// map postgres codes so clients see our envelope, not a 500 with an sql fragment.
const rpcError = (
  error: { readonly code?: string; readonly message?: string },
  resource: string,
): ApiError => {
  const message = error.message ?? 'The session operation failed.';
  if (error.code === 'P0002') return notFound(resource);
  if (error.code === '40001')
    return conflict(
      'version_conflict',
      'Version conflict',
      'The session changed since it was loaded.',
    );
  if (error.code === '23505' && message.toLowerCase().includes('idempotency')) {
    return conflict(
      'idempotency_conflict',
      'Idempotency conflict',
      'The idempotency key was already used with different content.',
    );
  }
  if (error.code === '22023') return invalidSession(message);
  return dependencyError('The session dependency rejected the operation.');
};

export class SupabaseSessionRepository implements SessionRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly clientFactory?: SupabaseClientFactory,
  ) {}

  private clientFor(accessToken?: string): SupabaseClient {
    // rpcs run as the jwt user. service role would skip owner checks.
    return this.clientFactory?.(accessToken) ?? this.client;
  }

  private async rpc<T>(
    functionName: string,
    parameters: Record<string, unknown>,
    resource: string,
    accessToken?: string,
  ): Promise<T> {
    const result = await this.clientFor(accessToken).rpc(functionName, parameters);
    if (result.error) throw rpcError(result.error, resource);
    return result.data as T;
  }

  async createWorkoutSession(input: {
    readonly userId: string;
    readonly workout: Workout;
    readonly clientRequestId: string;
    readonly accessToken?: string;
  }): Promise<WorkoutSession> {
    // one rpc creates the workout session plus child exercise sessions.
    const data = await this.rpc<unknown>(
      'create_workout_session',
      {
        p_user_id: input.userId,
        p_workout_id: input.workout.id,
        p_client_request_id: input.clientRequestId,
      },
      'workout_session',
      input.accessToken,
    );
    const sessionId = typeof data === 'string' ? data : rowString(rowRecord(data), 'id');
    const session = await this.getWorkoutSession(input.userId, sessionId, input.accessToken);
    if (session === null) throw dependencyError('The created workout session could not be loaded.');
    return session;
  }

  async listWorkoutSessions(
    userId: string,
    limit: number,
    cursor?: string,
    accessToken?: string,
  ): Promise<SessionListResult> {
    let query = this.clientFor(accessToken)
      .from('workout_sessions')
      .select('id,workout_id,state,started_at,ended_at,duration_seconds,version')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (cursor !== undefined) {
      const decoded = checkedCursor(cursor);
      query = query.or(
        `started_at.lt.${decoded.startedAt},and(started_at.eq.${decoded.startedAt},id.lt.${decoded.id})`,
      );
    }
    const result = await query;
    if (result.error) throw dependencyError('The workout session list could not be loaded.');
    const rows = rowArray(result.data);
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const last = pageRows.at(-1);
    return {
      data: pageRows.map(mapWorkoutSession),
      page: {
        hasMore,
        nextCursor:
          hasMore && last !== undefined
            ? encodeCursor(rowString(last, 'started_at'), rowString(last, 'id'))
            : null,
      },
    };
  }

  async getWorkoutSession(
    userId: string,
    sessionId: string,
    accessToken?: string,
  ): Promise<WorkoutSession | null> {
    const result = await this.clientFor(accessToken)
      .from('workout_sessions')
      .select('id,workout_id,state,started_at,ended_at,duration_seconds,version')
      .eq('user_id', userId)
      .eq('id', sessionId)
      .maybeSingle();
    if (result.error) throw dependencyError('The workout session could not be loaded.');
    return result.data === null ? null : mapWorkoutSession(result.data);
  }

  async patchWorkoutSession(
    userId: string,
    sessionId: string,
    request: PatchWorkoutSessionRequest,
    accessToken?: string,
  ): Promise<WorkoutSession> {
    if (request.state === undefined) {
      const existing = await this.getWorkoutSession(userId, sessionId, accessToken);
      if (existing === null) throw notFound('workout_session');
      if (existing.version !== request.expectedVersion) {
        throw conflict(
          'version_conflict',
          'Version conflict',
          'The workout session changed since it was loaded.',
        );
      }
      return existing;
    }
    if (request.state === 'completed') {
      throw invalidSession('Use the completion endpoint to complete a workout session.');
    }
    await this.rpc<unknown>(
      'transition_workout_session',
      {
        p_user_id: userId,
        p_session_id: sessionId,
        p_expected_version: request.expectedVersion,
        p_next_state: request.state,
        p_end_reason: request.endReason ?? null,
      },
      'workout_session',
      accessToken,
    );
    const updated = await this.getWorkoutSession(userId, sessionId, accessToken);
    if (updated === null) throw dependencyError('The updated workout session could not be loaded.');
    return updated;
  }

  async completeWorkoutSession(
    userId: string,
    sessionId: string,
    expectedVersion: number,
    endReason?: string,
    accessToken?: string,
  ): Promise<WorkoutSession> {
    await this.rpc<unknown>(
      'complete_workout_session',
      {
        p_user_id: userId,
        p_session_id: sessionId,
        p_expected_version: expectedVersion,
        p_end_reason: endReason ?? null,
      },
      'workout_session',
      accessToken,
    );
    const updated = await this.getWorkoutSession(userId, sessionId, accessToken);
    if (updated === null)
      throw dependencyError('The completed workout session could not be loaded.');
    return updated;
  }

  async deleteWorkoutSession(
    userId: string,
    sessionId: string,
    accessToken?: string,
  ): Promise<void> {
    await this.rpc<boolean>(
      'delete_workout_session',
      { p_user_id: userId, p_session_id: sessionId },
      'workout_session',
      accessToken,
    );
  }

  async listExerciseSessions(
    userId: string,
    workoutSessionId: string,
    accessToken?: string,
  ): Promise<readonly ExerciseSession[]> {
    const parent = await this.getWorkoutSession(userId, workoutSessionId, accessToken);
    if (parent === null) throw notFound('workout_session');
    const result = await this.clientFor(accessToken)
      .from('exercise_sessions')
      .select(
        'id,workout_session_id,workout_item_id,exercise_id,state,target_snapshot,completed_reps,completed_sets,started_at,ended_at,version',
      )
      .eq('user_id', userId)
      .eq('workout_session_id', workoutSessionId)
      .order('created_at', { ascending: true });
    if (result.error) throw dependencyError('The exercise session list could not be loaded.');
    return rowArray(result.data).map((row) => mapExerciseSession(row).session);
  }

  async getExerciseSession(
    userId: string,
    sessionId: string,
    accessToken?: string,
  ): Promise<ExerciseSession | null> {
    const result = await this.clientFor(accessToken)
      .from('exercise_sessions')
      .select(
        'id,workout_session_id,workout_item_id,exercise_id,state,target_snapshot,completed_reps,completed_sets,started_at,ended_at,version',
      )
      .eq('user_id', userId)
      .eq('id', sessionId)
      .maybeSingle();
    if (result.error) throw dependencyError('The exercise session could not be loaded.');
    return result.data === null ? null : mapExerciseSession(result.data).session;
  }

  private async getExerciseRecord(
    userId: string,
    sessionId: string,
    accessToken?: string,
  ): Promise<{ readonly session: ExerciseSession; readonly target: SessionTarget }> {
    const result = await this.clientFor(accessToken)
      .from('exercise_sessions')
      .select(
        'id,workout_session_id,workout_item_id,exercise_id,state,target_snapshot,completed_reps,completed_sets,started_at,ended_at,version',
      )
      .eq('user_id', userId)
      .eq('id', sessionId)
      .maybeSingle();
    if (result.error) throw dependencyError('The exercise session could not be loaded.');
    if (result.data === null) throw notFound('exercise_session');
    return mapExerciseSession(result.data);
  }

  async patchExerciseSession(
    userId: string,
    sessionId: string,
    request: PatchExerciseSessionRequest,
    accessToken?: string,
  ): Promise<ExerciseSession> {
    if (request.state === undefined) {
      const existing = await this.getExerciseSession(userId, sessionId, accessToken);
      if (existing === null) throw notFound('exercise_session');
      if (existing.version !== request.expectedVersion) {
        throw conflict(
          'version_conflict',
          'Version conflict',
          'The exercise session changed since it was loaded.',
        );
      }
      return existing;
    }
    if (request.state === 'completed') {
      throw invalidSession('Use the completion endpoint to save the exercise analysis.');
    }
    await this.rpc<unknown>(
      'transition_exercise_session',
      {
        p_user_id: userId,
        p_session_id: sessionId,
        p_expected_version: request.expectedVersion,
        p_next_state: request.state,
      },
      'exercise_session',
      accessToken,
    );
    const updated = await this.getExerciseSession(userId, sessionId, accessToken);
    if (updated === null)
      throw dependencyError('The updated exercise session could not be loaded.');
    return updated;
  }

  async ingestMetricBatch(
    userId: string,
    sessionId: string,
    batch: MetricBatchRequest,
    accessToken?: string,
  ): Promise<MetricBatchResponse['data']> {
    validateBatch(batch);
    // transactional ingest + progress rebuild live in postgres so retries stay idempotent.
    const data = await this.rpc<unknown>(
      'ingest_metric_batch',
      {
        p_user_id: userId,
        p_exercise_session_id: sessionId,
        p_batch_id: batch.batchId,
        p_request_hash: hashRequest(batch),
        p_metrics: batch.metrics,
      },
      'exercise_session',
      accessToken,
    );
    const row = rowRecord(data);
    return {
      acceptedCount: rowNumber(row, 'acceptedCount') ?? 0,
      duplicateCount: rowNumber(row, 'duplicateCount') ?? 0,
      rejectedCount: rowNumber(row, 'rejectedCount') ?? 0,
    };
  }

  private async listMetrics(
    userId: string,
    sessionId: string,
    accessToken?: string,
  ): Promise<readonly RepMetric[]> {
    const result = await this.clientFor(accessToken)
      .from('rep_metrics')
      .select(
        'set_number,rep_number,counted,duration_ms,range_of_motion_deg,target_position_reached,accuracy_score,control_score,stability_score,form_score,tracking_confidence,feedback_codes,recorded_offset_ms',
      )
      .eq('user_id', userId)
      .eq('exercise_session_id', sessionId)
      .order('recorded_offset_ms', { ascending: true, nullsFirst: false })
      .order('set_number', { ascending: true })
      .order('rep_number', { ascending: true });
    if (result.error) throw dependencyError('The exercise metrics could not be loaded.');
    return rowArray(result.data).map(mapMetric);
  }

  async completeExerciseSession(
    userId: string,
    sessionId: string,
    expectedVersion: number,
    accessToken?: string,
  ): Promise<ExerciseAnalysis> {
    const record = await this.getExerciseRecord(userId, sessionId, accessToken);
    if (record.session.state === 'completed')
      return this.getExerciseAnalysis(userId, sessionId, accessToken);
    const metrics = await this.listMetrics(userId, sessionId, accessToken);
    const analysis = analyzeExerciseSession({
      targetReps: record.session.targetReps,
      metrics: domainMetrics(metrics),
      ...(record.target.rangeOfMotionTarget === undefined
        ? {}
        : { romTarget: record.target.rangeOfMotionTarget }),
      ...(record.target.tempoTarget === undefined
        ? {}
        : { tempoTarget: record.target.tempoTarget }),
    });
    const countedReps = metrics.filter((metric) => metric.counted).length;
    const completedSets = new Set(
      metrics.filter((metric) => metric.counted).map((metric) => metric.setNumber),
    ).size;
    const result = await this.rpc<unknown>(
      'complete_exercise_session',
      {
        p_user_id: userId,
        p_exercise_session_id: sessionId,
        p_expected_version: expectedVersion,
        p_analysis: analysis,
        p_counted_reps: countedReps,
        p_completed_sets: Math.min(record.session.targetSets, completedSets),
        p_overall_score: analysis.overallScore,
      },
      'exercise_session',
      accessToken,
    );
    const returned = rowRecord(result).analysis;
    return (
      typeof returned === 'object' && returned !== null ? returned : analysis
    ) as ExerciseAnalysis;
  }

  async getExerciseAnalysis(
    userId: string,
    sessionId: string,
    accessToken?: string,
  ): Promise<ExerciseAnalysis> {
    const session = await this.getExerciseSession(userId, sessionId, accessToken);
    if (session === null) throw notFound('exercise_session');
    const result = await this.clientFor(accessToken)
      .from('exercise_session_summaries')
      .select('analysis')
      .eq('user_id', userId)
      .eq('exercise_session_id', sessionId)
      .maybeSingle();
    if (result.error) throw dependencyError('The exercise analysis could not be loaded.');
    if (result.data === null) {
      throw conflict(
        'analysis_not_ready',
        'Analysis not ready',
        'Complete the exercise session before requesting analysis.',
      );
    }
    return rowRecord(result.data).analysis as ExerciseAnalysis;
  }

  async getProgressSummary(userId: string, accessToken?: string): Promise<ProgressSummary> {
    const dailyResult = await this.clientFor(accessToken)
      .from('daily_progress')
      .select('session_count,exercise_count,set_count,rep_count,active_seconds')
      .eq('user_id', userId);
    if (dailyResult.error) throw dependencyError('Progress totals could not be loaded.');
    const daily = rowArray(dailyResult.data);
    const summaryResult = await this.clientFor(accessToken)
      .from('exercise_session_summaries')
      .select('overall_score')
      .eq('user_id', userId);
    if (summaryResult.error) throw dependencyError('Progress scores could not be loaded.');
    const scores = rowArray(summaryResult.data)
      .map((row) => rowNumber(row, 'overall_score'))
      .filter((score): score is number => score !== null);
    const exerciseResult = await this.clientFor(accessToken)
      .from('exercise_sessions')
      .select('exercise_id')
      .eq('user_id', userId)
      .eq('state', 'completed');
    if (exerciseResult.error) throw dependencyError('Body coverage could not be loaded.');
    const exerciseIds = [
      ...new Set(
        rowArray(exerciseResult.data).flatMap((row) =>
          typeof row.exercise_id === 'string' ? [row.exercise_id] : [],
        ),
      ),
    ];
    const coverage = new Map<string, number>();
    if (exerciseIds.length > 0) {
      const demandResult = await this.clientFor(accessToken)
        .from('exercise_body_demands')
        .select('body_region_id,demand')
        .in('exercise_id', exerciseIds);
      if (demandResult.error) throw dependencyError('Body coverage could not be loaded.');
      for (const row of rowArray(demandResult.data)) {
        const region = typeof row.body_region_id === 'string' ? row.body_region_id : null;
        if (region === null) continue;
        const intensity = row.demand === 'high' ? 100 : row.demand === 'moderate' ? 60 : 25;
        coverage.set(region, Math.max(coverage.get(region) ?? 0, intensity));
      }
    }
    return {
      totalActiveSeconds: daily.reduce(
        (sum, row) => sum + (rowNumber(row, 'active_seconds') ?? 0),
        0,
      ),
      totalExercises: daily.reduce((sum, row) => sum + (rowNumber(row, 'exercise_count') ?? 0), 0),
      totalSets: daily.reduce((sum, row) => sum + (rowNumber(row, 'set_count') ?? 0), 0),
      totalReps: daily.reduce((sum, row) => sum + (rowNumber(row, 'rep_count') ?? 0), 0),
      averageScore:
        scores.length === 0 ? null : scores.reduce((sum, score) => sum + score, 0) / scores.length,
      bodyCoverage: [...coverage.entries()].map(([bodyRegionId, intensity]) => ({
        bodyRegionId,
        intensity,
      })),
    };
  }

  async listProgressActivity(
    userId: string,
    startDate: string,
    endDate: string,
    limit: number,
    cursor?: string,
    accessToken?: string,
  ): Promise<{
    readonly data: readonly ProgressActivityRow[];
    readonly page: { readonly nextCursor: string | null; readonly hasMore: boolean };
  }> {
    let query = this.clientFor(accessToken)
      .from('daily_progress')
      .select(
        'activity_date,session_count,exercise_count,set_count,rep_count,active_seconds,average_score',
      )
      .eq('user_id', userId)
      .gte('activity_date', startDate)
      .lte('activity_date', endDate)
      .order('activity_date', { ascending: false })
      .limit(limit + 1);
    if (cursor !== undefined) query = query.lt('activity_date', cursor);
    const result = await query;
    if (result.error) throw dependencyError('Progress activity could not be loaded.');
    const rows = rowArray(result.data);
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    return {
      data: pageRows.map((row) => ({
        activityDate: rowString(row, 'activity_date'),
        sessionCount: rowNumber(row, 'session_count') ?? 0,
        exerciseCount: rowNumber(row, 'exercise_count') ?? 0,
        setCount: rowNumber(row, 'set_count') ?? 0,
        repCount: rowNumber(row, 'rep_count') ?? 0,
        activeSeconds: rowNumber(row, 'active_seconds') ?? 0,
        averageScore: rowNumber(row, 'average_score'),
      })),
      page: {
        hasMore,
        nextCursor: hasMore ? rowString(pageRows.at(-1) ?? {}, 'activity_date') : null,
      },
    };
  }

  async getExerciseProgress(
    userId: string,
    exerciseId: string,
    accessToken?: string,
  ): Promise<ExerciseProgressResponse['data']> {
    const sessionResult = await this.clientFor(accessToken)
      .from('exercise_sessions')
      .select('id,ended_at')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('state', 'completed')
      .order('ended_at', { ascending: false });
    if (sessionResult.error) throw dependencyError('Exercise progress could not be loaded.');
    const sessionRows = rowArray(sessionResult.data);
    const ids = sessionRows.flatMap((row) => (typeof row.id === 'string' ? [row.id] : []));
    if (ids.length === 0) {
      return {
        exerciseId,
        currentScore: null,
        baselineScore: null,
        scoreDelta: null,
        relativePercentage: null,
      };
    }
    const summaryResult = await this.clientFor(accessToken)
      .from('exercise_session_summaries')
      .select('exercise_session_id,overall_score')
      .eq('user_id', userId)
      .in('exercise_session_id', ids);
    if (summaryResult.error) throw dependencyError('Exercise progress could not be loaded.');
    const scoreBySession = new Map(
      rowArray(summaryResult.data).flatMap((row) => {
        const id = typeof row.exercise_session_id === 'string' ? row.exercise_session_id : null;
        const score = rowNumber(row, 'overall_score');
        return id === null || score === null ? [] : [[id, score] as const];
      }),
    );
    const scores = ids.flatMap((id) => {
      const score = scoreBySession.get(id);
      return score === undefined ? [] : [score];
    });
    const comparison = compareProgress(scores[0] ?? null, scores.slice(1));
    return {
      exerciseId,
      currentScore: scores[0] ?? null,
      baselineScore: comparison?.baselineScore ?? null,
      scoreDelta: comparison?.scoreDelta ?? null,
      relativePercentage: comparison?.relativePercentage ?? null,
    };
  }
}
