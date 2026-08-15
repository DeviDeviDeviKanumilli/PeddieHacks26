import type {
  ExerciseAnalysis,
  ExerciseProgressResponse,
  ExerciseSession,
  MetricBatchRequest,
  MetricBatchResponse,
  PatchExerciseSessionRequest,
  PatchWorkoutSessionRequest,
  ProgressSummary,
  Workout,
  WorkoutSession,
} from '@peddie/contracts';
import { compareProgress } from '@peddie/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogRepository } from './catalog-repository.js';
import { ApiError } from './errors.js';
import type { Prisma, PrismaClient } from './generated/prisma/client.js';
import { withUserPrismaContext } from './prisma-client.js';
import {
  type ProgressActivityRow,
  type SessionListResult,
  type SessionRepository,
  SupabaseSessionRepository,
} from './session-repository.js';
import type { SupabaseClientFactory } from './supabase-client.js';

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

const targetRepsFor = (sets: number, reps: number | undefined): number =>
  reps === undefined ? 0 : sets * reps;

type SessionTarget = {
  readonly sets: number;
  readonly reps?: number;
  readonly holdSeconds?: number;
  readonly rangeOfMotionTarget?: { readonly minDeg: number; readonly maxDeg: number };
  readonly tempoTarget?: { readonly minSeconds: number; readonly maxSeconds: number };
};

const rowRecord = (value: Prisma.JsonValue): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const targetFromSnapshot = (snapshot: Prisma.JsonValue): SessionTarget => {
  const value = rowRecord(snapshot);
  const rom = rowRecord(value.rangeOfMotionTarget as Prisma.JsonValue);
  const tempo = rowRecord(value.tempoTarget as Prisma.JsonValue);
  return {
    sets: typeof value.sets === 'number' ? value.sets : 1,
    ...(typeof value.reps === 'number' ? { reps: value.reps } : {}),
    ...(typeof value.holdSeconds === 'number' ? { holdSeconds: value.holdSeconds } : {}),
    ...(typeof rom.minDeg === 'number' && typeof rom.maxDeg === 'number'
      ? { rangeOfMotionTarget: { minDeg: rom.minDeg, maxDeg: rom.maxDeg } }
      : {}),
    ...(typeof tempo.minSeconds === 'number' && typeof tempo.maxSeconds === 'number'
      ? { tempoTarget: { minSeconds: tempo.minSeconds, maxSeconds: tempo.maxSeconds } }
      : {}),
  };
};

const mapWorkoutSession = (row: {
  readonly id: string;
  readonly workout_id: string;
  readonly state: string;
  readonly started_at: Date;
  readonly ended_at: Date | null;
  readonly duration_seconds: number | null;
  readonly version: bigint;
}): WorkoutSession => ({
  id: row.id,
  workoutId: row.workout_id,
  state: row.state as WorkoutSession['state'],
  startedAt: row.started_at.toISOString(),
  endedAt: row.ended_at?.toISOString() ?? null,
  durationSeconds: row.duration_seconds,
  version: Number(row.version),
});

const mapExerciseSession = (row: {
  readonly id: string;
  readonly workout_session_id: string;
  readonly workout_item_id: string | null;
  readonly exercise_id: string;
  readonly state: string;
  readonly target_snapshot: Prisma.JsonValue;
  readonly completed_reps: number;
  readonly completed_sets: number;
  readonly started_at: Date | null;
  readonly ended_at: Date | null;
  readonly version: bigint;
}): { readonly session: ExerciseSession; readonly target: SessionTarget } => {
  const target = targetFromSnapshot(row.target_snapshot);
  return {
    target,
    session: {
      id: row.id,
      workoutSessionId: row.workout_session_id,
      workoutItemId: row.workout_item_id,
      exerciseId: row.exercise_id,
      state: row.state as ExerciseSession['state'],
      targetReps: targetRepsFor(target.sets, target.reps),
      targetSets: target.sets,
      completedReps: row.completed_reps,
      completedSets: row.completed_sets,
      startedAt: row.started_at?.toISOString() ?? null,
      endedAt: row.ended_at?.toISOString() ?? null,
      version: Number(row.version),
    },
  };
};

const checkedCursor = (value: string): { readonly startedAt: string; readonly id: string } => {
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('startedAt' in decoded) ||
      !('id' in decoded) ||
      typeof decoded.startedAt !== 'string' ||
      typeof decoded.id !== 'string' ||
      Number.isNaN(Date.parse(decoded.startedAt))
    ) {
      throw new Error('invalid cursor');
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

const encodeCursor = (startedAt: string, id: string): string =>
  Buffer.from(JSON.stringify({ startedAt, id }), 'utf8').toString('base64url');

const dateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const numberOrNull = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

export class PrismaSessionRepository implements SessionRepository {
  private readonly rpcRepository: SupabaseSessionRepository;

  constructor(
    private readonly database: PrismaClient,
    client: SupabaseClient,
    clientFactory?: SupabaseClientFactory,
    _catalog?: CatalogRepository,
  ) {
    this.rpcRepository = new SupabaseSessionRepository(client, clientFactory);
  }

  createWorkoutSession(input: {
    readonly userId: string;
    readonly workout: Workout;
    readonly clientRequestId: string;
    readonly accessToken?: string;
  }): Promise<WorkoutSession> {
    return this.rpcRepository.createWorkoutSession(input);
  }

  async listWorkoutSessions(
    userId: string,
    limit: number,
    cursor?: string,
    _accessToken?: string,
  ): Promise<SessionListResult> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const where: Prisma.workout_sessionsWhereInput = { user_id: userId };
        if (cursor !== undefined) {
          const decoded = checkedCursor(cursor);
          const startedAt = new Date(decoded.startedAt);
          where.OR = [
            { started_at: { lt: startedAt } },
            { started_at: startedAt, id: { lt: decoded.id } },
          ];
        }
        const rows = await database.workout_sessions.findMany({
          where,
          orderBy: [{ started_at: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          select: {
            id: true,
            workout_id: true,
            state: true,
            started_at: true,
            ended_at: true,
            duration_seconds: true,
            version: true,
          },
        });
        const pageRows = rows.slice(0, limit);
        const hasMore = rows.length > pageRows.length;
        const last = pageRows.at(-1);
        return {
          data: pageRows.map(mapWorkoutSession),
          page: {
            hasMore,
            nextCursor:
              hasMore && last !== undefined
                ? encodeCursor(last.started_at.toISOString(), last.id)
                : null,
          },
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The workout session list could not be loaded.');
    }
  }

  async getWorkoutSession(
    userId: string,
    sessionId: string,
    _accessToken?: string,
  ): Promise<WorkoutSession | null> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const row = await database.workout_sessions.findFirst({
          where: { user_id: userId, id: sessionId },
          select: {
            id: true,
            workout_id: true,
            state: true,
            started_at: true,
            ended_at: true,
            duration_seconds: true,
            version: true,
          },
        });
        return row === null ? null : mapWorkoutSession(row);
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The workout session could not be loaded.');
    }
  }

  patchWorkoutSession(
    userId: string,
    sessionId: string,
    request: PatchWorkoutSessionRequest,
    accessToken?: string,
  ): Promise<WorkoutSession> {
    return this.rpcRepository.patchWorkoutSession(userId, sessionId, request, accessToken);
  }

  completeWorkoutSession(
    userId: string,
    sessionId: string,
    expectedVersion: number,
    endReason?: string,
    accessToken?: string,
  ): Promise<WorkoutSession> {
    return this.rpcRepository.completeWorkoutSession(
      userId,
      sessionId,
      expectedVersion,
      endReason,
      accessToken,
    );
  }

  deleteWorkoutSession(userId: string, sessionId: string, accessToken?: string): Promise<void> {
    return this.rpcRepository.deleteWorkoutSession(userId, sessionId, accessToken);
  }

  async listExerciseSessions(
    userId: string,
    workoutSessionId: string,
    _accessToken?: string,
  ): Promise<readonly ExerciseSession[]> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const parent = await database.workout_sessions.findFirst({
          where: { user_id: userId, id: workoutSessionId },
          select: { id: true },
        });
        if (parent === null) throw notFound('workout_session');
        const rows = await database.exercise_sessions.findMany({
          where: { user_id: userId, workout_session_id: workoutSessionId },
          orderBy: { created_at: 'asc' },
          select: {
            id: true,
            workout_session_id: true,
            workout_item_id: true,
            exercise_id: true,
            state: true,
            target_snapshot: true,
            completed_reps: true,
            completed_sets: true,
            started_at: true,
            ended_at: true,
            version: true,
          },
        });
        return rows.map((row) => mapExerciseSession(row).session);
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The exercise session list could not be loaded.');
    }
  }

  async getExerciseSession(
    userId: string,
    sessionId: string,
    _accessToken?: string,
  ): Promise<ExerciseSession | null> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const row = await database.exercise_sessions.findFirst({
          where: { user_id: userId, id: sessionId },
          select: {
            id: true,
            workout_session_id: true,
            workout_item_id: true,
            exercise_id: true,
            state: true,
            target_snapshot: true,
            completed_reps: true,
            completed_sets: true,
            started_at: true,
            ended_at: true,
            version: true,
          },
        });
        return row === null ? null : mapExerciseSession(row).session;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The exercise session could not be loaded.');
    }
  }

  patchExerciseSession(
    userId: string,
    sessionId: string,
    request: PatchExerciseSessionRequest,
    accessToken?: string,
  ): Promise<ExerciseSession> {
    return this.rpcRepository.patchExerciseSession(userId, sessionId, request, accessToken);
  }

  ingestMetricBatch(
    userId: string,
    sessionId: string,
    batch: MetricBatchRequest,
    accessToken?: string,
  ): Promise<MetricBatchResponse['data']> {
    return this.rpcRepository.ingestMetricBatch(userId, sessionId, batch, accessToken);
  }

  completeExerciseSession(
    userId: string,
    sessionId: string,
    expectedVersion: number,
    accessToken?: string,
  ): Promise<ExerciseAnalysis> {
    return this.rpcRepository.completeExerciseSession(
      userId,
      sessionId,
      expectedVersion,
      accessToken,
    );
  }

  async getExerciseAnalysis(
    userId: string,
    sessionId: string,
    _accessToken?: string,
  ): Promise<ExerciseAnalysis> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const session = await database.exercise_sessions.findFirst({
          where: { user_id: userId, id: sessionId },
          select: { id: true },
        });
        if (session === null) throw notFound('exercise_session');
        const summary = await database.exercise_session_summaries.findFirst({
          where: { user_id: userId, exercise_session_id: sessionId },
          select: { analysis: true },
        });
        if (summary === null) {
          throw conflict(
            'analysis_not_ready',
            'Analysis not ready',
            'Complete the exercise session before requesting analysis.',
          );
        }
        return summary.analysis as ExerciseAnalysis;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The exercise analysis could not be loaded.');
    }
  }

  async getProgressSummary(userId: string, _accessToken?: string): Promise<ProgressSummary> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const [daily, summaries, completedExercises] = await Promise.all([
          database.daily_progress.findMany({
            where: { user_id: userId },
            select: {
              session_count: true,
              exercise_count: true,
              set_count: true,
              rep_count: true,
              active_seconds: true,
            },
          }),
          database.exercise_session_summaries.findMany({
            where: { user_id: userId },
            select: { overall_score: true },
          }),
          database.exercise_sessions.findMany({
            where: { user_id: userId, state: 'completed' },
            select: { exercise_id: true },
          }),
        ]);
        const scores = summaries
          .map((row) => numberOrNull(row.overall_score))
          .filter((score): score is number => score !== null);
        const exerciseIds = [...new Set(completedExercises.map((row) => row.exercise_id))];
        const demands =
          exerciseIds.length === 0
            ? []
            : await database.exercise_body_demands.findMany({
                where: { exercise_id: { in: exerciseIds } },
                select: { body_region_id: true, demand: true },
              });
        const coverage = new Map<string, number>();
        for (const demand of demands) {
          const intensity = demand.demand === 'high' ? 100 : demand.demand === 'moderate' ? 60 : 25;
          coverage.set(
            demand.body_region_id,
            Math.max(coverage.get(demand.body_region_id) ?? 0, intensity),
          );
        }
        return {
          totalActiveSeconds: daily.reduce((sum, row) => sum + row.active_seconds, 0),
          totalExercises: daily.reduce((sum, row) => sum + row.exercise_count, 0),
          totalSets: daily.reduce((sum, row) => sum + row.set_count, 0),
          totalReps: daily.reduce((sum, row) => sum + row.rep_count, 0),
          averageScore:
            scores.length === 0
              ? null
              : scores.reduce((sum, score) => sum + score, 0) / scores.length,
          bodyCoverage: [...coverage.entries()].map(([bodyRegionId, intensity]) => ({
            bodyRegionId,
            intensity,
          })),
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('Progress totals could not be loaded.');
    }
  }

  async listProgressActivity(
    userId: string,
    startDate: string,
    endDate: string,
    limit: number,
    cursor?: string,
    _accessToken?: string,
  ): Promise<{
    readonly data: readonly ProgressActivityRow[];
    readonly page: { readonly nextCursor: string | null; readonly hasMore: boolean };
  }> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const where: Prisma.daily_progressWhereInput = {
          user_id: userId,
          activity_date: {
            gte: new Date(`${startDate}T00:00:00.000Z`),
            lte: new Date(`${endDate}T00:00:00.000Z`),
          },
        };
        if (cursor !== undefined) {
          const cursorDate = new Date(`${cursor}T00:00:00.000Z`);
          if (Number.isNaN(cursorDate.valueOf())) {
            throw new ApiError({
              statusCode: 400,
              code: 'invalid_cursor',
              title: 'Invalid cursor',
              detail: 'The pagination cursor is invalid or expired.',
            });
          }
          const range = where.activity_date as Prisma.DateTimeFilter;
          where.activity_date = { ...range, lt: cursorDate };
        }
        const rows = await database.daily_progress.findMany({
          where,
          orderBy: { activity_date: 'desc' },
          take: limit + 1,
          select: {
            activity_date: true,
            session_count: true,
            exercise_count: true,
            set_count: true,
            rep_count: true,
            active_seconds: true,
            average_score: true,
          },
        });
        const pageRows = rows.slice(0, limit);
        const hasMore = rows.length > pageRows.length;
        return {
          data: pageRows.map((row) => ({
            activityDate: dateOnly(row.activity_date),
            sessionCount: row.session_count,
            exerciseCount: row.exercise_count,
            setCount: row.set_count,
            repCount: row.rep_count,
            activeSeconds: row.active_seconds,
            averageScore: numberOrNull(row.average_score),
          })),
          page: {
            hasMore,
            nextCursor: hasMore ? dateOnly(pageRows.at(-1)?.activity_date ?? new Date()) : null,
          },
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('Progress activity could not be loaded.');
    }
  }

  async getExerciseProgress(
    userId: string,
    exerciseId: string,
    _accessToken?: string,
  ): Promise<ExerciseProgressResponse['data']> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const sessions = await database.exercise_sessions.findMany({
          where: { user_id: userId, exercise_id: exerciseId, state: 'completed' },
          orderBy: { ended_at: 'desc' },
          select: { id: true },
        });
        if (sessions.length === 0) {
          return {
            exerciseId,
            currentScore: null,
            baselineScore: null,
            scoreDelta: null,
            relativePercentage: null,
          };
        }
        const summaries = await database.exercise_session_summaries.findMany({
          where: { user_id: userId, exercise_session_id: { in: sessions.map((row) => row.id) } },
          select: { exercise_session_id: true, overall_score: true },
        });
        const scoreBySession = new Map(
          summaries.flatMap((row) => {
            const score = numberOrNull(row.overall_score);
            return score === null ? [] : [[row.exercise_session_id, score] as const];
          }),
        );
        const scores = sessions.flatMap((row) => {
          const score = scoreBySession.get(row.id);
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
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('Exercise progress could not be loaded.');
    }
  }
}
