import type {
  CreateManualWorkoutRequest,
  PatchWorkoutItemRequest,
  PatchWorkoutRequest,
  Workout,
  WorkoutItem,
} from '@peddie/contracts';
import type { GeneratedWorkout } from '@peddie/domain';
import { ApiError } from './errors.js';
import { Prisma, type PrismaClient } from './generated/prisma/client.js';
import { withUserPrismaContext } from './prisma-client.js';
import type {
  ManualWorkoutItemDraft,
  WorkoutListResult,
  WorkoutRepository,
} from './workout-repository.js';

// owner workouts through postgres rls. accesstoken is unused because claims are set in-txn.

const dependencyError = (detail: string): ApiError =>
  new ApiError({
    statusCode: 503,
    code: 'dependency_unavailable',
    title: 'Workout storage unavailable',
    detail,
  });

const notFound = (code: 'workout_not_found' | 'workout_item_not_found'): ApiError =>
  new ApiError({
    statusCode: 404,
    code,
    title: code === 'workout_not_found' ? 'Workout not found' : 'Workout item not found',
    detail:
      code === 'workout_not_found'
        ? 'The requested workout is not available.'
        : 'The requested workout item is not available.',
  });

const conflict = (detail: string, code = 'version_conflict'): ApiError =>
  new ApiError({
    statusCode: 409,
    code,
    title: code === 'version_conflict' ? 'Version conflict' : 'Idempotency conflict',
    detail,
  });

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
      typeof decoded.id !== 'string' ||
      Number.isNaN(Date.parse(decoded.createdAt))
    ) {
      throw new Error('invalid cursor');
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

const jsonInput = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

type PrismaWorkoutRow = {
  readonly id: string;
  readonly source: string;
  readonly title: string;
  readonly status: string;
  readonly requested_duration_minutes: number | null;
  readonly engine_version: string | null;
  readonly profile_version: bigint | null;
  readonly version: bigint;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly workout_items: readonly {
    readonly id: string;
    readonly position: number;
    readonly exercise_id: string;
    readonly sets: number;
    readonly reps: number | null;
    readonly hold_seconds: number | null;
    readonly rest_seconds: number;
    readonly compatibility_snapshot: Prisma.JsonValue;
    readonly exercises: { readonly slug: string };
  }[];
};

const mapWorkout = (row: PrismaWorkoutRow): Workout => ({
  id: row.id,
  source: row.source as Workout['source'],
  title: row.title,
  status: row.status as Workout['status'],
  requestedDurationMinutes: row.requested_duration_minutes,
  engineVersion: row.engine_version,
  profileVersion: row.profile_version === null ? null : Number(row.profile_version),
  version: Number(row.version),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  items: row.workout_items.map((item) => ({
    id: item.id,
    position: item.position,
    exerciseId: item.exercise_id,
    exerciseSlug: item.exercises.slug,
    sets: item.sets,
    ...(item.reps === null ? {} : { reps: item.reps }),
    ...(item.hold_seconds === null ? {} : { holdSeconds: item.hold_seconds }),
    restSeconds: item.rest_seconds,
    compatibility: item.compatibility_snapshot as WorkoutItem['compatibility'],
  })),
});

export class PrismaWorkoutRepository implements WorkoutRepository {
  constructor(private readonly database: PrismaClient) {}

  private async load(
    database: Prisma.TransactionClient,
    userId: string,
    workoutId: string,
  ): Promise<Workout | null> {
    // rls is the real owner check; user_id here is defense in depth.
    const row = await database.workouts.findFirst({
      where: { id: workoutId, user_id: userId, status: { not: 'archived' } },
      include: {
        workout_items: {
          orderBy: { position: 'asc' },
          include: { exercises: { select: { slug: true } } },
        },
      },
    });
    return row === null ? null : mapWorkout(row);
  }

  private async idempotentExisting(
    database: Prisma.TransactionClient,
    userId: string,
    clientRequestId: string,
    requestHash: string,
  ): Promise<Workout | null> {
    const existing = await database.workouts.findFirst({
      where: { user_id: userId, client_request_id: clientRequestId },
      select: { id: true, request_hash: true },
    });
    if (existing === null) return null;
    // unique (user, client_request_id) is the retry key. hash mismatch is not a retry.
    if (existing.request_hash !== requestHash) {
      throw conflict(
        'The client request ID was already used with different content.',
        'idempotency_conflict',
      );
    }
    const workout = await this.load(database, userId, existing.id);
    if (workout === null) throw dependencyError('The idempotent workout could not be loaded.');
    return workout;
  }

  async createGenerated(input: {
    readonly userId: string;
    readonly clientRequestId: string;
    readonly requestHash: string;
    readonly title: string;
    readonly profileVersion: number;
    readonly requestSnapshot: unknown;
    readonly generated: GeneratedWorkout;
    readonly accessToken?: string;
  }): Promise<Workout> {
    try {
      return await withUserPrismaContext(this.database, input.userId, async (database) => {
        const existing = await this.idempotentExisting(
          database,
          input.userId,
          input.clientRequestId,
          input.requestHash,
        );
        if (existing !== null) return existing;
        const workout = await database.workouts.create({
          data: {
            user_id: input.userId,
            client_request_id: input.clientRequestId,
            request_hash: input.requestHash,
            source: 'generated',
            title: input.title,
            status: 'draft',
            requested_duration_minutes: input.generated.requestedDurationMinutes,
            engine_version: input.generated.engineVersion,
            profile_version: BigInt(input.profileVersion),
            generation_request_snapshot: jsonInput(input.requestSnapshot),
          },
          select: { id: true },
        });
        if (input.generated.items.length > 0) {
          await database.workout_items.createMany({
            data: input.generated.items.map((item) => ({
              user_id: input.userId,
              workout_id: workout.id,
              position: item.position,
              exercise_id: item.exerciseId,
              sets: item.sets,
              reps: item.reps ?? null,
              hold_seconds: item.holdSeconds ?? null,
              rest_seconds: item.restSeconds,
              compatibility_snapshot: jsonInput(item.compatibility),
            })),
          });
        }
        const loaded = await this.load(database, input.userId, workout.id);
        if (loaded === null) throw dependencyError('The generated workout could not be loaded.');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // race with another insert of the same clientrequestid.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict(
          'The client request ID was already used with different content.',
          'idempotency_conflict',
        );
      }
      throw dependencyError('The generated workout could not be saved.');
    }
  }

  async createManual(input: {
    readonly userId: string;
    readonly request: CreateManualWorkoutRequest;
    readonly requestHash: string;
    readonly items: readonly ManualWorkoutItemDraft[];
    readonly accessToken?: string;
  }): Promise<Workout> {
    try {
      return await withUserPrismaContext(this.database, input.userId, async (database) => {
        const existing = await this.idempotentExisting(
          database,
          input.userId,
          input.request.clientRequestId,
          input.requestHash,
        );
        if (existing !== null) return existing;
        const workout = await database.workouts.create({
          data: {
            user_id: input.userId,
            client_request_id: input.request.clientRequestId,
            request_hash: input.requestHash,
            source: 'manual',
            title: input.request.title,
            status: 'draft',
          },
          select: { id: true },
        });
        if (input.items.length > 0) {
          await database.workout_items.createMany({
            data: input.items.map((item, index) => ({
              user_id: input.userId,
              workout_id: workout.id,
              position: index + 1,
              exercise_id: item.exerciseId,
              sets: item.sets,
              reps: item.reps ?? null,
              hold_seconds: item.holdSeconds ?? null,
              rest_seconds: item.restSeconds,
              compatibility_snapshot: jsonInput(item.compatibility),
            })),
          });
        }
        const loaded = await this.load(database, input.userId, workout.id);
        if (loaded === null) throw dependencyError('The manual workout could not be loaded.');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict(
          'The client request ID was already used with different content.',
          'idempotency_conflict',
        );
      }
      throw dependencyError('The manual workout could not be saved.');
    }
  }

  async list(
    userId: string,
    limit: number,
    cursor?: string,
    _accessToken?: string,
  ): Promise<WorkoutListResult> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const where: Prisma.workoutsWhereInput = {
          user_id: userId,
          status: { not: 'archived' },
        };
        if (cursor !== undefined) {
          const decoded = decodeCursor(cursor);
          where.OR = [
            { created_at: { lt: new Date(decoded.createdAt) } },
            { created_at: new Date(decoded.createdAt), id: { lt: decoded.id } },
          ];
        }
        const rows = await database.workouts.findMany({
          where,
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          include: {
            workout_items: {
              orderBy: { position: 'asc' },
              include: { exercises: { select: { slug: true } } },
            },
          },
        });
        const pageRows = rows.slice(0, limit);
        const hasMore = rows.length > pageRows.length;
        const last = pageRows.at(-1);
        return {
          data: pageRows.map(mapWorkout),
          page: {
            hasMore,
            nextCursor:
              hasMore && last !== undefined
                ? encodeCursor(last.created_at.toISOString(), last.id)
                : null,
          },
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The workout history could not be loaded.');
    }
  }

  async get(userId: string, workoutId: string, _accessToken?: string): Promise<Workout | null> {
    try {
      return await withUserPrismaContext(this.database, userId, (database) =>
        this.load(database, userId, workoutId),
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The workout dependency could not be reached.');
    }
  }

  async patch(
    userId: string,
    workoutId: string,
    request: PatchWorkoutRequest,
    _accessToken?: string,
  ): Promise<Workout> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const updated = await database.workouts.updateMany({
          where: {
            id: workoutId,
            user_id: userId,
            version: BigInt(request.expectedVersion),
            status: { not: 'archived' },
          },
          data: {
            ...(request.title === undefined ? {} : { title: request.title }),
            ...(request.status === undefined ? {} : { status: request.status }),
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          const existing = await this.load(database, userId, workoutId);
          if (existing === null) throw notFound('workout_not_found');
          throw conflict('The workout changed since it was loaded.');
        }
        const loaded = await this.load(database, userId, workoutId);
        if (loaded === null) throw dependencyError('The updated workout could not be loaded.');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The workout could not be updated.');
    }
  }

  async archive(userId: string, workoutId: string, _accessToken?: string): Promise<Workout> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const current = await this.load(database, userId, workoutId);
        if (current === null) throw notFound('workout_not_found');
        const updated = await database.workouts.updateMany({
          where: {
            id: workoutId,
            user_id: userId,
            version: BigInt(current.version),
            status: { not: 'archived' },
          },
          data: { status: 'archived', version: { increment: 1 } },
        });
        if (updated.count !== 1) throw notFound('workout_not_found');
        const loaded = await this.load(database, userId, workoutId);
        if (loaded !== null) return loaded;
        return {
          ...current,
          status: 'archived',
          version: current.version + 1,
          updatedAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The workout could not be archived.');
    }
  }

  async patchItem(
    userId: string,
    workoutId: string,
    itemId: string,
    request: PatchWorkoutItemRequest,
    item: WorkoutItem,
    _accessToken?: string,
  ): Promise<Workout> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const workout = await database.workouts.findFirst({
          where: { id: workoutId, user_id: userId, status: { not: 'archived' } },
          select: { version: true },
        });
        if (workout === null) throw notFound('workout_not_found');
        if (Number(workout.version) !== request.expectedWorkoutVersion) {
          throw conflict('The workout changed since it was loaded.');
        }
        const existingItem = await database.workout_items.findFirst({
          where: { id: itemId, workout_id: workoutId, user_id: userId },
          select: { id: true },
        });
        if (existingItem === null) throw notFound('workout_item_not_found');
        const exercise = await database.exercises.findFirst({
          where: { id: item.exerciseId, active: true },
          select: { id: true },
        });
        if (exercise === null) throw notFound('workout_item_not_found');
        const workoutUpdated = await database.workouts.updateMany({
          where: {
            id: workoutId,
            user_id: userId,
            version: BigInt(request.expectedWorkoutVersion),
            status: { not: 'archived' },
          },
          data: { version: { increment: 1 } },
        });
        if (workoutUpdated.count !== 1) throw conflict('The workout changed since it was loaded.');
        const itemUpdated = await database.workout_items.updateMany({
          where: { id: itemId, workout_id: workoutId, user_id: userId },
          data: {
            exercise_id: item.exerciseId,
            sets: item.sets,
            reps: item.reps ?? null,
            hold_seconds: item.holdSeconds ?? null,
            rest_seconds: item.restSeconds,
            compatibility_snapshot: jsonInput(item.compatibility),
            version: { increment: 1 },
          },
        });
        if (itemUpdated.count !== 1) throw notFound('workout_item_not_found');
        const loaded = await this.load(database, userId, workoutId);
        if (loaded === null) throw dependencyError('The updated workout could not be loaded.');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The workout item could not be updated.');
    }
  }
}
