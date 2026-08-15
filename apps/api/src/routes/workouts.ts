import {
  type CreateManualWorkoutRequest,
  CreateManualWorkoutRequestSchema,
  type GenerateWorkoutRequest,
  GenerateWorkoutRequestSchema,
  GenerateWorkoutResponseSchema,
  type PatchWorkoutRequest,
  PatchWorkoutRequestSchema,
  WorkoutListResponseSchema,
  WorkoutResponseSchema,
} from '@peddie/contracts';
import {
  evaluateCompatibility,
  type GeneratedWorkout,
  type GenerationRequest,
  generateWorkout,
  InsufficientCompatibleExercisesError,
} from '@peddie/domain';
import { type Static, Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireUser } from '../auth.js';
import type { CatalogRepository, MovementProfileRepository } from '../catalog-repository.js';
import { ApiError } from '../errors.js';
import {
  hashRequest,
  type ManualWorkoutItemDraft,
  type WorkoutRepository,
} from '../workout-repository.js';

const WorkoutIdParamsSchema = Type.Object({
  workoutId: Type.String({ minLength: 1, maxLength: 120 }),
});
const WorkoutListQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' })),
  cursor: Type.Optional(Type.String({ maxLength: 512 })),
});
type WorkoutIdParams = Static<typeof WorkoutIdParamsSchema>;
type WorkoutListQuery = Static<typeof WorkoutListQuerySchema>;

const requestUserId = (request: FastifyRequest): string => {
  if (request.userId === null) {
    throw new ApiError({
      statusCode: 401,
      code: 'authentication_required',
      title: 'Authentication required',
      detail: 'Sign in before accessing this resource.',
    });
  }
  return request.userId;
};

const parseLimit = (value: string | undefined): number => {
  const limit = Number.parseInt(value ?? '20', 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError({
      statusCode: 400,
      code: 'invalid_limit',
      title: 'Invalid limit',
      detail: 'limit must be an integer from 1 through 100.',
    });
  }
  return limit;
};

const generationInput = (
  body: GenerateWorkoutRequest,
  profile: Awaited<ReturnType<MovementProfileRepository['getMovementProfile']>>,
  candidates: Awaited<ReturnType<CatalogRepository['listExerciseCandidates']>>,
): GenerationRequest => {
  return {
    profile,
    candidates,
    durationMinutes: body.durationMinutes,
    ...(body.primaryRegionIds === undefined ? {} : { primaryRegionIds: body.primaryRegionIds }),
    ...(body.secondaryRegionIds === undefined
      ? {}
      : { secondaryRegionIds: body.secondaryRegionIds }),
    ...(body.goalIds === undefined ? {} : { goalIds: body.goalIds }),
    ...(body.equipmentIds === undefined ? {} : { equipmentIds: body.equipmentIds }),
    ...(body.intensityPreference === undefined
      ? {}
      : { intensityPreference: body.intensityPreference }),
  };
};

const validatePrescription = (item: CreateManualWorkoutRequest['items'][number]): void => {
  const hasReps = item.reps !== undefined;
  const hasHold = item.holdSeconds !== undefined;
  if (hasReps === hasHold) {
    throw new ApiError({
      statusCode: 422,
      code: 'invalid_prescription',
      title: 'Invalid prescription',
      detail: 'Each workout item must specify reps or holdSeconds, but not both.',
    });
  }
};

const manualDraftFor = async (
  userId: string,
  request: CreateManualWorkoutRequest,
  dependencies: {
    readonly catalog: CatalogRepository;
    readonly profiles: MovementProfileRepository;
  },
): Promise<readonly ManualWorkoutItemDraft[]> => {
  const profile = await dependencies.profiles.getMovementProfile(userId);
  const drafts: ManualWorkoutItemDraft[] = [];
  for (const item of request.items) {
    validatePrescription(item);
    const candidate = await dependencies.catalog.getExerciseCandidate(item.exerciseId);
    if (candidate === null) {
      throw new ApiError({
        statusCode: 422,
        code: 'unknown_exercise',
        title: 'Unknown exercise',
        detail: 'Every manual workout item must reference an active exercise.',
      });
    }
    const compatibility = evaluateCompatibility(candidate, profile);
    if (compatibility.status === 'incompatible') {
      throw new ApiError({
        statusCode: 422,
        code: 'incompatible_exercise',
        title: 'Incompatible exercise',
        detail: 'Manual workouts cannot include a hard-incompatible exercise.',
      });
    }
    const acknowledgements = new Set(item.cautionAcknowledgements ?? []);
    const missingAcknowledgements = compatibility.reasons
      .filter((reason) => reason.severity === 'warning')
      .map((reason) => reason.code)
      .filter((code) => !acknowledgements.has(code));
    if (missingAcknowledgements.length > 0) {
      throw new ApiError({
        statusCode: 422,
        code: 'caution_acknowledgement_required',
        title: 'Caution acknowledgement required',
        detail: 'A caution exercise requires acknowledgement of each warning code.',
        errors: missingAcknowledgements.map((code) => ({
          code,
          message: 'Acknowledge this caution before continuing.',
        })),
      });
    }
    drafts.push({
      exerciseId: candidate.id,
      exerciseSlug: candidate.slug,
      sets: item.sets,
      ...(item.reps === undefined ? {} : { reps: item.reps }),
      ...(item.holdSeconds === undefined ? {} : { holdSeconds: item.holdSeconds }),
      restSeconds: item.restSeconds,
      compatibility,
    });
  }
  return drafts;
};

export const registerWorkoutRoutes = async (
  app: FastifyInstance,
  dependencies: {
    readonly catalog: CatalogRepository;
    readonly profiles: MovementProfileRepository;
    readonly workouts: WorkoutRepository;
  },
): Promise<void> => {
  app.post<{ Body: GenerateWorkoutRequest }>(
    '/v1/workouts/generate',
    {
      preHandler: requireUser,
      schema: {
        body: GenerateWorkoutRequestSchema,
        response: { 201: GenerateWorkoutResponseSchema },
      },
    },
    async (request, reply) => {
      const userId = requestUserId(request);
      const profile = await dependencies.profiles.getMovementProfile(userId);
      const candidates = await dependencies.catalog.listExerciseCandidates();
      let generated: GeneratedWorkout;
      try {
        generated = generateWorkout(generationInput(request.body, profile, candidates));
      } catch (error) {
        if (error instanceof InsufficientCompatibleExercisesError) {
          throw new ApiError({
            statusCode: 422,
            code: error.code,
            title: 'Insufficient compatible exercises',
            detail: error.message,
            errors: error.suggestions.map((suggestion) => ({
              code: 'suggestion',
              message: suggestion,
            })),
          });
        }
        throw error;
      }
      const workout = await dependencies.workouts.createGenerated({
        userId,
        clientRequestId: request.body.clientRequestId,
        requestHash: hashRequest(request.body),
        title: 'Adaptive workout',
        profileVersion: profile.version,
        requestSnapshot: request.body,
        generated,
      });
      const items = generated.items.map((item, index) => {
        const storedItem = workout.items[index];
        if (storedItem === undefined) {
          throw new ApiError({
            statusCode: 503,
            code: 'workout_storage_inconsistent',
            title: 'Workout storage error',
            detail: 'The generated workout items could not be reconciled.',
          });
        }
        return { ...item, id: storedItem.id };
      });
      return reply.status(201).send({
        data: {
          workoutId: workout.id,
          source: 'generated' as const,
          status:
            workout.status === 'archived' || workout.status === 'completed'
              ? 'draft'
              : workout.status,
          version: workout.version,
          createdAt: workout.createdAt,
          updatedAt: workout.updatedAt,
          engineVersion: generated.engineVersion,
          requestedDurationMinutes: generated.requestedDurationMinutes,
          totalEstimatedSeconds: generated.totalEstimatedSeconds,
          items,
        },
      });
    },
  );

  app.post<{ Body: CreateManualWorkoutRequest }>(
    '/v1/workouts',
    {
      preHandler: requireUser,
      schema: { body: CreateManualWorkoutRequestSchema, response: { 201: WorkoutResponseSchema } },
    },
    async (request, reply) => {
      const userId = requestUserId(request);
      const items = await manualDraftFor(userId, request.body, dependencies);
      const workout = await dependencies.workouts.createManual({
        userId,
        request: request.body,
        requestHash: hashRequest(request.body),
        items,
      });
      return reply.status(201).send({ data: workout });
    },
  );

  app.get<{ Querystring: WorkoutListQuery }>(
    '/v1/workouts',
    {
      preHandler: requireUser,
      schema: { querystring: WorkoutListQuerySchema, response: { 200: WorkoutListResponseSchema } },
    },
    async (request) =>
      dependencies.workouts.list(
        requestUserId(request),
        parseLimit(request.query.limit),
        request.query.cursor,
      ),
  );

  app.get<{ Params: WorkoutIdParams }>(
    '/v1/workouts/:workoutId',
    {
      preHandler: requireUser,
      schema: { params: WorkoutIdParamsSchema, response: { 200: WorkoutResponseSchema } },
    },
    async (request) => {
      const workout = await dependencies.workouts.get(
        requestUserId(request),
        request.params.workoutId,
      );
      if (workout === null) {
        throw new ApiError({
          statusCode: 404,
          code: 'workout_not_found',
          title: 'Workout not found',
          detail: 'The requested workout is not available.',
        });
      }
      return { data: workout };
    },
  );

  app.patch<{ Params: WorkoutIdParams; Body: PatchWorkoutRequest }>(
    '/v1/workouts/:workoutId',
    {
      preHandler: requireUser,
      schema: {
        params: WorkoutIdParamsSchema,
        body: PatchWorkoutRequestSchema,
        response: { 200: WorkoutResponseSchema },
      },
    },
    async (request) => ({
      data: await dependencies.workouts.patch(
        requestUserId(request),
        request.params.workoutId,
        request.body,
      ),
    }),
  );

  app.delete<{ Params: WorkoutIdParams }>(
    '/v1/workouts/:workoutId',
    {
      preHandler: requireUser,
      schema: { params: WorkoutIdParamsSchema, response: { 200: WorkoutResponseSchema } },
    },
    async (request) => ({
      data: await dependencies.workouts.archive(requestUserId(request), request.params.workoutId),
    }),
  );
};
