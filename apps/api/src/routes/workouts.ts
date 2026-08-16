import {
  type CreateManualWorkoutRequest,
  CreateManualWorkoutRequestSchema,
  ExerciseAlternativesResponseSchema,
  type GenerateWorkoutRequest,
  GenerateWorkoutRequestSchema,
  GenerateWorkoutResponseSchema,
  type PatchWorkoutItemRequest,
  PatchWorkoutItemRequestSchema,
  type PatchWorkoutRequest,
  PatchWorkoutRequestSchema,
  type WorkoutItem,
  WorkoutListResponseSchema,
  WorkoutResponseSchema,
} from '@peddie/contracts';
import {
  evaluateCompatibility,
  type GeneratedWorkout,
  type GenerationRequest,
  generateWorkout,
  InsufficientCompatibleExercisesError,
  rankExercises,
} from '@peddie/domain';
import { type Static, Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { requestAuth, requireUser } from '../auth.js';
import type { CatalogRepository, MovementProfileRepository } from '../catalog-repository.js';
import type { RateLimitConfig } from '../config.js';
import { ApiError } from '../errors.js';
import {
  hashRequest,
  type ManualWorkoutItemDraft,
  type WorkoutRepository,
} from '../workout-repository.js';

// generation and compatibility come from domain. handlers only auth, persist, and map errors.

const WorkoutIdParamsSchema = Type.Object({
  workoutId: Type.String({ minLength: 1, maxLength: 120 }),
});
const WorkoutItemParamsSchema = Type.Object({
  workoutId: Type.String({ minLength: 1, maxLength: 120 }),
  itemId: Type.String({ minLength: 1, maxLength: 120 }),
});
const WorkoutListQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' })),
  cursor: Type.Optional(Type.String({ maxLength: 512 })),
});
type WorkoutIdParams = Static<typeof WorkoutIdParamsSchema>;
type WorkoutItemParams = Static<typeof WorkoutItemParamsSchema>;
type WorkoutListQuery = Static<typeof WorkoutListQuerySchema>;

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
  // catalog items are reps xor hold. both/neither would break session targets later.
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
  accessToken: string,
  dependencies: {
    readonly catalog: CatalogRepository;
    readonly profiles: MovementProfileRepository;
  },
): Promise<readonly ManualWorkoutItemDraft[]> => {
  const profile = await dependencies.profiles.getMovementProfile(userId, accessToken);
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
    // warnings are allowed only after the client echoes each reason code.
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

const contractCompatibility = (
  compatibility: Awaited<ReturnType<typeof evaluateCompatibility>>,
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

const patchPrescription = (
  current: WorkoutItem,
  request: PatchWorkoutItemRequest,
): { readonly reps?: number; readonly holdSeconds?: number } => {
  const repsProvided = request.reps !== undefined;
  const holdProvided = request.holdSeconds !== undefined;
  if (!repsProvided && !holdProvided) {
    if (current.reps !== undefined) return { reps: current.reps };
    if (current.holdSeconds !== undefined) return { holdSeconds: current.holdSeconds };
    throw new ApiError({
      statusCode: 503,
      code: 'workout_storage_inconsistent',
      title: 'Workout storage error',
      detail: 'The workout item has no valid prescription.',
    });
  }
  const reps = typeof request.reps === 'number' ? request.reps : undefined;
  const holdSeconds = typeof request.holdSeconds === 'number' ? request.holdSeconds : undefined;
  if ((reps === undefined) === (holdSeconds === undefined)) {
    throw new ApiError({
      statusCode: 422,
      code: 'invalid_prescription',
      title: 'Invalid prescription',
      detail: 'A workout item must specify reps or holdSeconds, but not both.',
    });
  }
  if (reps !== undefined) return { reps };
  if (holdSeconds !== undefined) return { holdSeconds };
  throw new ApiError({
    statusCode: 422,
    code: 'invalid_prescription',
    title: 'Invalid prescription',
    detail: 'A workout item must specify reps or holdSeconds, but not both.',
  });
};

const patchedItemFor = async (
  userId: string,
  accessToken: string,
  workout: Awaited<ReturnType<WorkoutRepository['get']>>,
  itemId: string,
  request: PatchWorkoutItemRequest,
  dependencies: {
    readonly catalog: CatalogRepository;
    readonly profiles: MovementProfileRepository;
  },
): Promise<WorkoutItem> => {
  if (workout === null) {
    throw new ApiError({
      statusCode: 404,
      code: 'workout_not_found',
      title: 'Workout not found',
      detail: 'The requested workout is not available.',
    });
  }
  const current = workout.items.find((item) => item.id === itemId);
  if (current === undefined) {
    throw new ApiError({
      statusCode: 404,
      code: 'workout_item_not_found',
      title: 'Workout item not found',
      detail: 'The requested workout item is not available.',
    });
  }
  const candidate = await dependencies.catalog.getExerciseCandidate(
    request.exerciseId ?? current.exerciseId,
  );
  if (candidate === null) {
    throw new ApiError({
      statusCode: 422,
      code: 'unknown_exercise',
      title: 'Unknown exercise',
      detail: 'The workout item must reference an active exercise.',
    });
  }
  const compatibility = evaluateCompatibility(
    candidate,
    await dependencies.profiles.getMovementProfile(userId, accessToken),
  );
  if (compatibility.status === 'incompatible') {
    throw new ApiError({
      statusCode: 422,
      code: 'incompatible_exercise',
      title: 'Incompatible exercise',
      detail: 'The replacement exercise is not compatible with the movement profile.',
    });
  }
  if (request.exerciseId !== undefined && request.exerciseId !== current.exerciseId) {
    const acknowledgements = new Set(request.cautionAcknowledgements ?? []);
    const missingAcknowledgements = compatibility.reasons
      .filter((reason) => reason.severity === 'warning')
      .map((reason) => reason.code)
      .filter((code) => !acknowledgements.has(code));
    if (missingAcknowledgements.length > 0) {
      throw new ApiError({
        statusCode: 422,
        code: 'caution_acknowledgement_required',
        title: 'Caution acknowledgement required',
        detail: 'A replacement exercise requires acknowledgement of each warning code.',
        errors: missingAcknowledgements.map((code) => ({
          code,
          message: 'Acknowledge this caution before continuing.',
        })),
      });
    }
  }
  const prescription = patchPrescription(current, request);
  return {
    id: current.id,
    position: current.position,
    exerciseId: candidate.id,
    exerciseSlug: candidate.slug,
    sets: request.sets ?? current.sets,
    ...prescription,
    restSeconds: request.restSeconds ?? current.restSeconds,
    compatibility: contractCompatibility(compatibility),
  };
};

export const registerWorkoutRoutes = async (
  app: FastifyInstance,
  dependencies: {
    readonly catalog: CatalogRepository;
    readonly profiles: MovementProfileRepository;
    readonly workouts: WorkoutRepository;
    readonly rateLimits: RateLimitConfig;
  },
): Promise<void> => {
  app.post<{ Body: GenerateWorkoutRequest }>(
    '/v1/workouts/generate',
    {
      config: {
        // generation is cpu-heavy. keep this bucket well below the general limiter.
        rateLimit: {
          max: dependencies.rateLimits.generation,
          timeWindow: '1 minute',
          groupId: 'workout-generation',
        },
      },
      preHandler: requireUser,
      schema: {
        body: GenerateWorkoutRequestSchema,
        response: { 201: GenerateWorkoutResponseSchema },
      },
    },
    async (request, reply) => {
      const auth = requestAuth(request);
      const userId = auth.userId;
      const profile = await dependencies.profiles.getMovementProfile(userId, auth.accessToken);
      const candidates = await dependencies.catalog.listExerciseCandidates();
      let generated: GeneratedWorkout;
      try {
        generated = generateWorkout(generationInput(request.body, profile, candidates));
      } catch (error) {
        // domain throws a typed shortage; map it so clients can show the suggestions.
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
        accessToken: auth.accessToken,
      });
      // persist assigns item ids; stitch them onto the domain payload for the 201 body.
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
      const auth = requestAuth(request);
      const userId = auth.userId;
      const items = await manualDraftFor(userId, request.body, auth.accessToken, dependencies);
      const workout = await dependencies.workouts.createManual({
        userId,
        request: request.body,
        requestHash: hashRequest(request.body),
        items,
        accessToken: auth.accessToken,
      });
      return reply.status(201).send({ data: workout });
    },
  );

  app.get<{ Params: WorkoutItemParams }>(
    '/v1/workouts/:workoutId/items/:itemId/alternatives',
    {
      preHandler: requireUser,
      schema: {
        params: WorkoutItemParamsSchema,
        response: { 200: ExerciseAlternativesResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      const userId = auth.userId;
      const workout = await dependencies.workouts.get(
        userId,
        request.params.workoutId,
        auth.accessToken,
      );
      if (workout === null) {
        throw new ApiError({
          statusCode: 404,
          code: 'workout_not_found',
          title: 'Workout not found',
          detail: 'The requested workout is not available.',
        });
      }
      const item = workout.items.find((candidate) => candidate.id === request.params.itemId);
      if (item === undefined) {
        throw new ApiError({
          statusCode: 404,
          code: 'workout_item_not_found',
          title: 'Workout item not found',
          detail: 'The requested workout item is not available.',
        });
      }
      const currentCandidate = await dependencies.catalog.getExerciseCandidate(item.exerciseId);
      if (currentCandidate === null) {
        throw new ApiError({
          statusCode: 503,
          code: 'workout_catalog_inconsistent',
          title: 'Workout catalog error',
          detail: 'The workout item references an unavailable exercise.',
        });
      }
      const profile = await dependencies.profiles.getMovementProfile(userId, auth.accessToken);
      const ranked = rankExercises({
        profile,
        candidates: (await dependencies.catalog.listExerciseCandidates()).filter(
          (candidate) => candidate.id !== currentCandidate.id,
        ),
        primaryRegionIds: currentCandidate.primaryRegionIds,
        previousExerciseFamilyKeys: [currentCandidate.familyKey],
        previousPrimaryRegionIds: currentCandidate.primaryRegionIds,
      }).filter((candidate) => candidate.compatibility.status !== 'incompatible');
      // cap at 5 so the client can swap without another generation round trip.
      const alternatives = [];
      for (const candidate of ranked.slice(0, 5)) {
        const exercise = await dependencies.catalog.getExercise(candidate.exercise.id);
        if (exercise !== null) {
          alternatives.push({
            exercise,
            compatibility: contractCompatibility(candidate.compatibility),
            rankScore: candidate.rankScore,
          });
        }
      }
      return { data: alternatives };
    },
  );

  app.patch<{ Params: WorkoutItemParams; Body: PatchWorkoutItemRequest }>(
    '/v1/workouts/:workoutId/items/:itemId',
    {
      preHandler: requireUser,
      schema: {
        params: WorkoutItemParamsSchema,
        body: PatchWorkoutItemRequestSchema,
        response: { 200: WorkoutResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      const userId = auth.userId;
      const workout = await dependencies.workouts.get(
        userId,
        request.params.workoutId,
        auth.accessToken,
      );
      // re-score the replacement in this handler; the repo only stores the already-checked item.
      const item = await patchedItemFor(
        userId,
        auth.accessToken,
        workout,
        request.params.itemId,
        request.body,
        dependencies,
      );
      return {
        data: await dependencies.workouts.patchItem(
          userId,
          request.params.workoutId,
          request.params.itemId,
          request.body,
          item,
          auth.accessToken,
        ),
      };
    },
  );

  app.get<{ Querystring: WorkoutListQuery }>(
    '/v1/workouts',
    {
      preHandler: requireUser,
      schema: { querystring: WorkoutListQuerySchema, response: { 200: WorkoutListResponseSchema } },
    },
    async (request) => {
      const auth = requestAuth(request);
      return dependencies.workouts.list(
        auth.userId,
        parseLimit(request.query.limit),
        request.query.cursor,
        auth.accessToken,
      );
    },
  );

  app.get<{ Params: WorkoutIdParams }>(
    '/v1/workouts/:workoutId',
    {
      preHandler: requireUser,
      schema: { params: WorkoutIdParamsSchema, response: { 200: WorkoutResponseSchema } },
    },
    async (request) => {
      const auth = requestAuth(request);
      const workout = await dependencies.workouts.get(
        auth.userId,
        request.params.workoutId,
        auth.accessToken,
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
    async (request) => {
      const auth = requestAuth(request);
      return {
        data: await dependencies.workouts.patch(
          auth.userId,
          request.params.workoutId,
          request.body,
          auth.accessToken,
        ),
      };
    },
  );

  app.delete<{ Params: WorkoutIdParams }>(
    '/v1/workouts/:workoutId',
    {
      preHandler: requireUser,
      schema: { params: WorkoutIdParamsSchema, response: { 200: WorkoutResponseSchema } },
    },
    async (request) => {
      const auth = requestAuth(request);
      return {
        // archive, not hard delete, so history and sessions can still resolve the plan.
        data: await dependencies.workouts.archive(
          auth.userId,
          request.params.workoutId,
          auth.accessToken,
        ),
      };
    },
  );
};
