import {
  CompatibilityResultSchema,
  ExerciseSummarySchema,
  PageSchema,
  ReferenceDataResponseSchema,
} from '@peddie/contracts';
import { evaluateCompatibility } from '@peddie/domain';
import { type Static, Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireUser } from '../auth.js';
import type {
  CatalogRepository,
  ExerciseListFilters,
  MovementProfileRepository,
} from '../catalog-repository.js';
import { ApiError } from '../errors.js';

const ExerciseListResponseSchema = Type.Object({
  data: Type.Array(ExerciseSummarySchema),
  page: PageSchema,
});
const ExerciseResponseSchema = Type.Object({ data: ExerciseSummarySchema });
const CompatibilityResponseSchema = Type.Object({ data: CompatibilityResultSchema });
const ExerciseIdParamsSchema = Type.Object({
  exerciseId: Type.String({ minLength: 1, maxLength: 120 }),
});
const ExerciseListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 120 })),
  bodyRegion: Type.Optional(Type.String({ maxLength: 80 })),
  category: Type.Optional(Type.String({ maxLength: 40 })),
  position: Type.Optional(Type.String({ maxLength: 40 })),
  equipment: Type.Optional(Type.String({ maxLength: 80 })),
  difficulty: Type.Optional(Type.String({ pattern: '^[1-5]$' })),
  trackingSupported: Type.Optional(Type.String({ pattern: '^(true|false)$' })),
  sort: Type.Optional(Type.String({ pattern: '^(slug|name|difficulty)$' })),
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' })),
  cursor: Type.Optional(Type.String({ maxLength: 512 })),
});
const CompatibilityQuerySchema = Type.Object({
  trackingRequired: Type.Optional(Type.String({ pattern: '^(true|false)$' })),
});

type ExerciseListQuery = Static<typeof ExerciseListQuerySchema>;
type ExerciseIdParams = Static<typeof ExerciseIdParamsSchema>;
type CompatibilityQuery = Static<typeof CompatibilityQuerySchema>;

const boolQuery = (value: string | undefined): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === 'true';
};

const listFilters = (query: ExerciseListQuery): ExerciseListFilters => {
  const limit = Number.parseInt(query.limit ?? '20', 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError({
      statusCode: 400,
      code: 'invalid_limit',
      title: 'Invalid limit',
      detail: 'limit must be an integer from 1 through 100.',
    });
  }
  const difficulty =
    query.difficulty === undefined ? undefined : Number.parseInt(query.difficulty, 10);
  const filters: ExerciseListFilters = { limit };
  if (query.search !== undefined) filters.search = query.search;
  if (query.bodyRegion !== undefined) filters.bodyRegionId = query.bodyRegion;
  if (query.category !== undefined) {
    filters.category = query.category as NonNullable<ExerciseListFilters['category']>;
  }
  if (query.position !== undefined) {
    filters.position = query.position as NonNullable<ExerciseListFilters['position']>;
  }
  if (query.equipment !== undefined) filters.equipmentId = query.equipment;
  if (difficulty !== undefined) filters.difficulty = difficulty;
  if (query.trackingSupported !== undefined)
    filters.trackingSupported = query.trackingSupported === 'true';
  if (query.sort !== undefined)
    filters.sort = query.sort as NonNullable<ExerciseListFilters['sort']>;
  if (query.cursor !== undefined) filters.cursor = query.cursor;
  return filters;
};

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

export const registerCatalogRoutes = async (
  app: FastifyInstance,
  dependencies: {
    readonly catalog: CatalogRepository;
    readonly profiles: MovementProfileRepository;
  },
): Promise<void> => {
  app.get(
    '/v1/reference-data',
    { schema: { response: { 200: ReferenceDataResponseSchema } } },
    async () => ({ data: await dependencies.catalog.getReferenceData() }),
  );

  app.get<{ Querystring: ExerciseListQuery }>(
    '/v1/exercises',
    {
      schema: {
        querystring: ExerciseListQuerySchema,
        response: { 200: ExerciseListResponseSchema },
      },
    },
    async (request) => dependencies.catalog.listExercises(listFilters(request.query)),
  );

  app.get<{ Params: ExerciseIdParams }>(
    '/v1/exercises/:exerciseId',
    {
      schema: {
        params: ExerciseIdParamsSchema,
        response: { 200: ExerciseResponseSchema },
      },
    },
    async (request) => {
      const exercise = await dependencies.catalog.getExercise(request.params.exerciseId);
      if (exercise === null) {
        throw new ApiError({
          statusCode: 404,
          code: 'exercise_not_found',
          title: 'Exercise not found',
          detail: 'The requested exercise is not available.',
        });
      }
      return { data: exercise };
    },
  );

  app.get<{ Params: ExerciseIdParams; Querystring: CompatibilityQuery }>(
    '/v1/exercises/:exerciseId/compatibility',
    {
      preHandler: requireUser,
      schema: {
        params: ExerciseIdParamsSchema,
        querystring: CompatibilityQuerySchema,
        response: { 200: CompatibilityResponseSchema },
      },
    },
    async (request) => {
      const candidate = await dependencies.catalog.getExerciseCandidate(request.params.exerciseId);
      if (candidate === null) {
        throw new ApiError({
          statusCode: 404,
          code: 'exercise_not_found',
          title: 'Exercise not found',
          detail: 'The requested exercise is not available.',
        });
      }
      const profile = await dependencies.profiles.getMovementProfile(requestUserId(request));
      const trackingRequired = boolQuery(request.query.trackingRequired);
      const compatibility = evaluateCompatibility(candidate, profile, {
        ...(trackingRequired === undefined ? {} : { trackingRequired }),
      });
      return { data: compatibility };
    },
  );
};
