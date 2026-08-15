import { createHash, randomUUID } from 'node:crypto';
import type {
  CreateManualWorkoutRequest,
  PatchWorkoutRequest,
  Workout,
  WorkoutItem,
} from '@peddie/contracts';
import type {
  CompatibilityResult as DomainCompatibilityResult,
  GeneratedWorkout,
  GeneratedWorkoutItem,
} from '@peddie/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from './errors.js';

export interface ManualWorkoutItemDraft {
  readonly exerciseId: string;
  readonly exerciseSlug: string;
  readonly sets: number;
  readonly reps?: number;
  readonly holdSeconds?: number;
  readonly restSeconds: number;
  readonly compatibility: DomainCompatibilityResult;
}

export interface WorkoutListResult {
  readonly data: readonly Workout[];
  readonly page: { readonly nextCursor: string | null; readonly hasMore: boolean };
}

export interface WorkoutRepository {
  createGenerated(input: {
    readonly userId: string;
    readonly clientRequestId: string;
    readonly requestHash: string;
    readonly title: string;
    readonly profileVersion: number;
    readonly requestSnapshot: unknown;
    readonly generated: GeneratedWorkout;
  }): Promise<Workout>;
  createManual(input: {
    readonly userId: string;
    readonly request: CreateManualWorkoutRequest;
    readonly requestHash: string;
    readonly items: readonly ManualWorkoutItemDraft[];
  }): Promise<Workout>;
  list(userId: string, limit: number, cursor?: string): Promise<WorkoutListResult>;
  get(userId: string, workoutId: string): Promise<Workout | null>;
  patch(userId: string, workoutId: string, request: PatchWorkoutRequest): Promise<Workout>;
  archive(userId: string, workoutId: string): Promise<Workout>;
}

export const hashRequest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const now = (): string => new Date().toISOString();

const encodeCursor = (createdAt: string, id: string): string =>
  Buffer.from(JSON.stringify({ createdAt, id }), 'utf8').toString('base64url');

const decodeCursor = (value: string): { readonly createdAt: string; readonly id: string } => {
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('createdAt' in decoded) ||
      !('id' in decoded) ||
      typeof decoded.createdAt !== 'string' ||
      typeof decoded.id !== 'string'
    ) {
      throw new Error('invalid');
    }
    return { createdAt: decoded.createdAt, id: decoded.id };
  } catch {
    throw new ApiError({
      statusCode: 400,
      code: 'invalid_cursor',
      title: 'Invalid cursor',
      detail: 'The pagination cursor is invalid or expired.',
    });
  }
};

const conflict = (detail: string, code = 'version_conflict'): ApiError =>
  new ApiError({
    statusCode: 409,
    code,
    title: code === 'version_conflict' ? 'Version conflict' : 'Idempotency conflict',
    detail,
  });

const toWorkoutItem = (item: GeneratedWorkoutItem, exerciseSlug: string): WorkoutItem => ({
  id: randomUUID(),
  position: item.position,
  exerciseId: item.exerciseId,
  exerciseSlug,
  sets: item.sets,
  ...(item.reps === undefined ? {} : { reps: item.reps }),
  ...(item.holdSeconds === undefined ? {} : { holdSeconds: item.holdSeconds }),
  restSeconds: item.restSeconds,
  compatibility: contractCompatibility(item.compatibility),
});

const manualItem = (item: ManualWorkoutItemDraft, position: number): WorkoutItem => ({
  id: randomUUID(),
  position,
  exerciseId: item.exerciseId,
  exerciseSlug: item.exerciseSlug,
  sets: item.sets,
  ...(item.reps === undefined ? {} : { reps: item.reps }),
  ...(item.holdSeconds === undefined ? {} : { holdSeconds: item.holdSeconds }),
  restSeconds: item.restSeconds,
  compatibility: contractCompatibility(item.compatibility),
});

const contractCompatibility = (
  compatibility: DomainCompatibilityResult,
): WorkoutItem['compatibility'] => ({
  exerciseId: compatibility.exerciseId,
  exerciseSlug: compatibility.exerciseSlug,
  status: compatibility.status,
  score: compatibility.score,
  engineVersion: compatibility.engineVersion,
  reasons: compatibility.reasons.map((reason) =>
    reason.relatedId === undefined
      ? { code: reason.code, severity: reason.severity, message: reason.message }
      : {
          code: reason.code,
          severity: reason.severity,
          message: reason.message,
          relatedId: reason.relatedId,
        },
  ),
});

interface StoredWorkout {
  readonly userId: string;
  readonly clientRequestId: string;
  readonly requestHash: string;
  readonly workout: Workout;
}

export class MemoryWorkoutRepository implements WorkoutRepository {
  private readonly workouts = new Map<string, StoredWorkout>();
  private readonly idempotency = new Map<string, string>();

  async createGenerated(input: {
    readonly userId: string;
    readonly clientRequestId: string;
    readonly requestHash: string;
    readonly title: string;
    readonly profileVersion: number;
    readonly requestSnapshot: unknown;
    readonly generated: GeneratedWorkout;
  }): Promise<Workout> {
    const idempotencyKey = `${input.userId}:${input.clientRequestId}`;
    const existingId = this.idempotency.get(idempotencyKey);
    if (existingId !== undefined) {
      const existing = this.workouts.get(existingId);
      if (existing === undefined) throw new Error('Stored workout index is inconsistent.');
      if (existing.requestHash !== input.requestHash) {
        throw conflict(
          'The client request ID was already used with different content.',
          'idempotency_conflict',
        );
      }
      return existing.workout;
    }
    const timestamp = now();
    const id = randomUUID();
    const workout: Workout = {
      id,
      source: 'generated',
      title: input.title,
      status: 'draft',
      requestedDurationMinutes: input.generated.requestedDurationMinutes,
      engineVersion: input.generated.engineVersion,
      profileVersion: input.profileVersion,
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      items: input.generated.items.map((item) => toWorkoutItem(item, item.exerciseSlug)),
    };
    this.workouts.set(id, {
      userId: input.userId,
      clientRequestId: input.clientRequestId,
      requestHash: input.requestHash,
      workout,
    });
    this.idempotency.set(idempotencyKey, id);
    return workout;
  }

  async createManual(input: {
    readonly userId: string;
    readonly request: CreateManualWorkoutRequest;
    readonly requestHash: string;
    readonly items: readonly ManualWorkoutItemDraft[];
  }): Promise<Workout> {
    const idempotencyKey = `${input.userId}:${input.request.clientRequestId}`;
    const existingId = this.idempotency.get(idempotencyKey);
    if (existingId !== undefined) {
      const existing = this.workouts.get(existingId);
      if (existing === undefined) throw new Error('Stored workout index is inconsistent.');
      if (existing.requestHash !== input.requestHash) {
        throw conflict(
          'The client request ID was already used with different content.',
          'idempotency_conflict',
        );
      }
      return existing.workout;
    }
    const timestamp = now();
    const id = randomUUID();
    const workout: Workout = {
      id,
      source: 'manual',
      title: input.request.title,
      status: 'draft',
      requestedDurationMinutes: null,
      engineVersion: null,
      profileVersion: null,
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      items: input.items.map(manualItem),
    };
    this.workouts.set(id, {
      userId: input.userId,
      clientRequestId: input.request.clientRequestId,
      requestHash: input.requestHash,
      workout,
    });
    this.idempotency.set(idempotencyKey, id);
    return workout;
  }

  async list(userId: string, limit: number, cursor?: string): Promise<WorkoutListResult> {
    let rows = [...this.workouts.values()]
      .filter((row) => row.userId === userId && row.workout.status !== 'archived')
      .sort((left, right) => {
        const created = right.workout.createdAt.localeCompare(left.workout.createdAt);
        return created === 0 ? right.workout.id.localeCompare(left.workout.id) : created;
      });
    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      const index = rows.findIndex(
        (row) => row.workout.createdAt === decoded.createdAt && row.workout.id === decoded.id,
      );
      if (index === -1) {
        throw new ApiError({
          statusCode: 400,
          code: 'invalid_cursor',
          title: 'Invalid cursor',
          detail: 'The cursor does not belong to this collection.',
        });
      }
      rows = rows.slice(index + 1);
    }
    const pageRows = rows.slice(0, limit);
    const hasMore = rows.length > pageRows.length;
    return {
      data: pageRows.map((row) => row.workout),
      page: {
        hasMore,
        nextCursor: hasMore
          ? encodeCursor(
              pageRows.at(-1)?.workout.createdAt ?? '',
              pageRows.at(-1)?.workout.id ?? '',
            )
          : null,
      },
    };
  }

  async get(userId: string, workoutId: string): Promise<Workout | null> {
    const row = this.workouts.get(workoutId);
    return row === undefined || row.userId !== userId || row.workout.status === 'archived'
      ? null
      : row.workout;
  }

  async patch(userId: string, workoutId: string, request: PatchWorkoutRequest): Promise<Workout> {
    const row = this.workouts.get(workoutId);
    if (row === undefined || row.userId !== userId || row.workout.status === 'archived') {
      throw new ApiError({
        statusCode: 404,
        code: 'workout_not_found',
        title: 'Workout not found',
        detail: 'The requested workout is not available.',
      });
    }
    if (row.workout.version !== request.expectedVersion)
      throw conflict('The workout changed since it was loaded.');
    const workout: Workout = {
      ...row.workout,
      ...(request.title === undefined ? {} : { title: request.title }),
      ...(request.status === undefined ? {} : { status: request.status }),
      version: row.workout.version + 1,
      updatedAt: now(),
    };
    this.workouts.set(workoutId, { ...row, workout });
    return workout;
  }

  async archive(userId: string, workoutId: string): Promise<Workout> {
    const row = this.workouts.get(workoutId);
    if (row === undefined || row.userId !== userId || row.workout.status === 'archived') {
      throw new ApiError({
        statusCode: 404,
        code: 'workout_not_found',
        title: 'Workout not found',
        detail: 'The requested workout is not available.',
      });
    }
    const workout: Workout = {
      ...row.workout,
      status: 'archived',
      version: row.workout.version + 1,
      updatedAt: now(),
    };
    this.workouts.set(workoutId, { ...row, workout });
    return workout;
  }
}

type Row = Record<string, unknown>;
const rowRecord = (value: unknown): Row =>
  typeof value === 'object' && value !== null ? (value as Row) : {};
const rowString = (row: Row, key: string): string => {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`Workout row is missing ${key}.`);
  return value;
};
const rowNumber = (row: Row, key: string): number | null => {
  const value = row[key];
  return typeof value === 'number' ? value : null;
};
const rowArray = (value: unknown): readonly Row[] =>
  Array.isArray(value) ? value.map(rowRecord) : [];

export class SupabaseWorkoutRepository implements WorkoutRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async load(userId: string, workoutId: string): Promise<Workout | null> {
    const workoutResult = await this.client
      .from('workouts')
      .select(
        'id,source,title,status,requested_duration_minutes,engine_version,profile_version,version,created_at,updated_at',
      )
      .eq('id', workoutId)
      .eq('user_id', userId)
      .neq('status', 'archived')
      .maybeSingle();
    if (workoutResult.error) throw dependencyError('The workout dependency could not be reached.');
    if (workoutResult.data === null) return null;
    const itemResult = await this.client
      .from('workout_items')
      .select(
        'id,position,exercise_id,sets,reps,hold_seconds,rest_seconds,compatibility_snapshot,exercises(slug)',
      )
      .eq('workout_id', workoutId)
      .eq('user_id', userId)
      .order('position');
    if (itemResult.error) throw dependencyError('The workout items could not be loaded.');
    const row = rowRecord(workoutResult.data);
    return {
      id: rowString(row, 'id'),
      source: rowString(row, 'source') as Workout['source'],
      title: rowString(row, 'title'),
      status: rowString(row, 'status') as Workout['status'],
      requestedDurationMinutes: rowNumber(row, 'requested_duration_minutes'),
      engineVersion: typeof row.engine_version === 'string' ? row.engine_version : null,
      profileVersion: rowNumber(row, 'profile_version'),
      version: rowNumber(row, 'version') ?? 1,
      createdAt: rowString(row, 'created_at'),
      updatedAt: rowString(row, 'updated_at'),
      items: rowArray(itemResult.data).map((item) => {
        const exercise = rowArray(item.exercises).at(0);
        const snapshot = rowRecord(item.compatibility_snapshot);
        return {
          id: rowString(item, 'id'),
          position: rowNumber(item, 'position') ?? 1,
          exerciseId: rowString(item, 'exercise_id'),
          exerciseSlug: typeof exercise?.slug === 'string' ? exercise.slug : 'unknown-exercise',
          sets: rowNumber(item, 'sets') ?? 1,
          ...(typeof item.reps === 'number' ? { reps: item.reps } : {}),
          ...(typeof item.hold_seconds === 'number' ? { holdSeconds: item.hold_seconds } : {}),
          restSeconds: rowNumber(item, 'rest_seconds') ?? 0,
          compatibility: snapshot as WorkoutItem['compatibility'],
        };
      }),
    };
  }

  async createGenerated(input: {
    readonly userId: string;
    readonly clientRequestId: string;
    readonly requestHash: string;
    readonly title: string;
    readonly profileVersion: number;
    readonly requestSnapshot: unknown;
    readonly generated: GeneratedWorkout;
  }): Promise<Workout> {
    const existing = await this.client
      .from('workouts')
      .select('id,request_hash')
      .eq('user_id', input.userId)
      .eq('client_request_id', input.clientRequestId)
      .maybeSingle();
    if (existing.error) throw dependencyError('The workout dependency could not be reached.');
    if (existing.data !== null) {
      const row = rowRecord(existing.data);
      if (row.request_hash !== input.requestHash)
        throw conflict(
          'The client request ID was already used with different content.',
          'idempotency_conflict',
        );
      const loaded = await this.load(input.userId, rowString(row, 'id'));
      if (loaded === null) throw dependencyError('The idempotent workout could not be loaded.');
      return loaded;
    }
    const workoutInsert = await this.client
      .from('workouts')
      .insert({
        user_id: input.userId,
        client_request_id: input.clientRequestId,
        request_hash: input.requestHash,
        source: 'generated',
        title: input.title,
        status: 'draft',
        requested_duration_minutes: input.generated.requestedDurationMinutes,
        engine_version: input.generated.engineVersion,
        profile_version: input.profileVersion,
        generation_request_snapshot: input.requestSnapshot,
      })
      .select('id')
      .single();
    if (workoutInsert.error) throw dependencyError('The generated workout could not be saved.');
    const workoutId = rowString(rowRecord(workoutInsert.data), 'id');
    const itemRows = input.generated.items.map((item) => ({
      user_id: input.userId,
      workout_id: workoutId,
      position: item.position,
      exercise_id: item.exerciseId,
      sets: item.sets,
      reps: item.reps ?? null,
      hold_seconds: item.holdSeconds ?? null,
      rest_seconds: item.restSeconds,
      compatibility_snapshot: item.compatibility,
    }));
    const items = await this.client.from('workout_items').insert(itemRows);
    if (items.error) throw dependencyError('The generated workout items could not be saved.');
    const loaded = await this.load(input.userId, workoutId);
    if (loaded === null) throw dependencyError('The generated workout could not be loaded.');
    return loaded;
  }

  async createManual(input: {
    readonly userId: string;
    readonly request: CreateManualWorkoutRequest;
    readonly requestHash: string;
    readonly items: readonly ManualWorkoutItemDraft[];
  }): Promise<Workout> {
    const existing = await this.client
      .from('workouts')
      .select('id,request_hash')
      .eq('user_id', input.userId)
      .eq('client_request_id', input.request.clientRequestId)
      .maybeSingle();
    if (existing.error) throw dependencyError('The workout dependency could not be reached.');
    if (existing.data !== null) {
      const row = rowRecord(existing.data);
      if (row.request_hash !== input.requestHash)
        throw conflict(
          'The client request ID was already used with different content.',
          'idempotency_conflict',
        );
      const loaded = await this.load(input.userId, rowString(row, 'id'));
      if (loaded === null) throw dependencyError('The idempotent workout could not be loaded.');
      return loaded;
    }
    const workoutInsert = await this.client
      .from('workouts')
      .insert({
        user_id: input.userId,
        client_request_id: input.request.clientRequestId,
        request_hash: input.requestHash,
        source: 'manual',
        title: input.request.title,
        status: 'draft',
      })
      .select('id')
      .single();
    if (workoutInsert.error) throw dependencyError('The manual workout could not be saved.');
    const workoutId = rowString(rowRecord(workoutInsert.data), 'id');
    const itemRows = input.items.map((item, index) => ({
      user_id: input.userId,
      workout_id: workoutId,
      position: index + 1,
      exercise_id: item.exerciseId,
      sets: item.sets,
      reps: item.reps ?? null,
      hold_seconds: item.holdSeconds ?? null,
      rest_seconds: item.restSeconds,
      compatibility_snapshot: item.compatibility,
    }));
    const items = await this.client.from('workout_items').insert(itemRows);
    if (items.error) throw dependencyError('The manual workout items could not be saved.');
    const loaded = await this.load(input.userId, workoutId);
    if (loaded === null) throw dependencyError('The manual workout could not be loaded.');
    return loaded;
  }

  async list(userId: string, limit: number, cursor?: string): Promise<WorkoutListResult> {
    let query = this.client
      .from('workouts')
      .select(
        'id,source,title,status,requested_duration_minutes,engine_version,profile_version,version,created_at,updated_at',
      )
      .eq('user_id', userId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      query = query.lt('created_at', decoded.createdAt);
    }
    const result = await query;
    if (result.error) throw dependencyError('The workout history could not be loaded.');
    const rows = rowArray(result.data);
    const pageRows = rows.slice(0, limit);
    const data: Workout[] = [];
    for (const row of pageRows) {
      const loaded = await this.load(userId, rowString(row, 'id'));
      if (loaded !== null) data.push(loaded);
    }
    const hasMore = rows.length > pageRows.length;
    const last = pageRows.at(-1);
    return {
      data,
      page: {
        hasMore,
        nextCursor:
          hasMore && last !== undefined
            ? encodeCursor(rowString(last, 'created_at'), rowString(last, 'id'))
            : null,
      },
    };
  }

  async get(userId: string, workoutId: string): Promise<Workout | null> {
    return this.load(userId, workoutId);
  }

  async patch(userId: string, workoutId: string, request: PatchWorkoutRequest): Promise<Workout> {
    const values = {
      ...(request.title === undefined ? {} : { title: request.title }),
      ...(request.status === undefined ? {} : { status: request.status }),
      version: request.expectedVersion + 1,
    };
    const result = await this.client
      .from('workouts')
      .update(values)
      .eq('id', workoutId)
      .eq('user_id', userId)
      .eq('version', request.expectedVersion)
      .neq('status', 'archived')
      .select('id')
      .maybeSingle();
    if (result.error) throw dependencyError('The workout could not be updated.');
    if (result.data === null) {
      const exists = await this.get(userId, workoutId);
      if (exists === null)
        throw new ApiError({
          statusCode: 404,
          code: 'workout_not_found',
          title: 'Workout not found',
          detail: 'The requested workout is not available.',
        });
      throw conflict('The workout changed since it was loaded.');
    }
    const loaded = await this.get(userId, workoutId);
    if (loaded === null) throw dependencyError('The updated workout could not be loaded.');
    return loaded;
  }

  async archive(userId: string, workoutId: string): Promise<Workout> {
    const current = await this.get(userId, workoutId);
    if (current === null) {
      throw new ApiError({
        statusCode: 404,
        code: 'workout_not_found',
        title: 'Workout not found',
        detail: 'The requested workout is not available.',
      });
    }
    const result = await this.client
      .from('workouts')
      .update({ status: 'archived', version: current.version + 1 })
      .eq('id', workoutId)
      .eq('user_id', userId)
      .eq('version', current.version)
      .neq('status', 'archived')
      .select('id')
      .maybeSingle();
    if (result.error) throw dependencyError('The workout could not be archived.');
    if (result.data === null)
      throw new ApiError({
        statusCode: 404,
        code: 'workout_not_found',
        title: 'Workout not found',
        detail: 'The requested workout is not available.',
      });
    const loaded = await this.get(userId, workoutId);
    if (loaded === null) throw dependencyError('The archived workout could not be loaded.');
    return loaded;
  }
}

const dependencyError = (detail: string): ApiError =>
  new ApiError({
    statusCode: 503,
    code: 'dependency_unavailable',
    title: 'Workout storage unavailable',
    detail,
  });
