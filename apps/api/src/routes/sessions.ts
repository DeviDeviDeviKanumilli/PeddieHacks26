import {
  CompleteSessionRequestSchema,
  CreateWorkoutSessionRequestSchema,
  ExerciseAnalysisResponseSchema,
  ExerciseProgressResponseSchema,
  ExerciseSessionListResponseSchema,
  ExerciseSessionResponseSchema,
  MetricBatchRequestSchema,
  MetricBatchResponseSchema,
  PatchExerciseSessionRequestSchema,
  PatchWorkoutSessionRequestSchema,
  ProgressActivityResponseSchema,
  ProgressSummaryResponseSchema,
  WorkoutSessionListResponseSchema,
  WorkoutSessionResponseSchema,
} from '@peddie/contracts';
import { type Static, Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { requestAuth, requireUser } from '../auth.js';
import { ApiError } from '../errors.js';
import type { SessionRepository } from '../session-repository.js';
import type { WorkoutRepository } from '../workout-repository.js';

const SessionIdParamsSchema = Type.Object({
  sessionId: Type.String({ minLength: 1, maxLength: 120 }),
});
const ExerciseSessionIdParamsSchema = Type.Object({
  exerciseSessionId: Type.String({ minLength: 1, maxLength: 120 }),
});
const ExerciseIdParamsSchema = Type.Object({
  exerciseId: Type.String({ minLength: 1, maxLength: 120 }),
});
const SessionListQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' })),
  cursor: Type.Optional(Type.String({ maxLength: 512 })),
});
const ActivityQuerySchema = Type.Object({
  startDate: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
  endDate: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' })),
  cursor: Type.Optional(Type.String({ maxLength: 32 })),
});

type SessionIdParams = Static<typeof SessionIdParamsSchema>;
type ExerciseSessionIdParams = Static<typeof ExerciseSessionIdParamsSchema>;
type ExerciseIdParams = Static<typeof ExerciseIdParamsSchema>;
type SessionListQuery = Static<typeof SessionListQuerySchema>;
type ActivityQuery = Static<typeof ActivityQuerySchema>;

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

const dateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const activityRange = (
  query: ActivityQuery,
): {
  readonly startDate: string;
  readonly endDate: string;
  readonly limit: number;
} => {
  const endDate = query.endDate ?? dateOnly(new Date());
  const endTime = Date.parse(`${endDate}T00:00:00.000Z`);
  const startDate = query.startDate ?? dateOnly(new Date(endTime - 30 * 86400000));
  const startTime = Date.parse(`${startDate}T00:00:00.000Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime) {
    throw new ApiError({
      statusCode: 400,
      code: 'invalid_date_range',
      title: 'Invalid date range',
      detail: 'startDate must be on or before endDate.',
    });
  }
  if (endTime - startTime > 366 * 86400000) {
    throw new ApiError({
      statusCode: 400,
      code: 'date_range_too_large',
      title: 'Date range too large',
      detail: 'Progress history can cover at most 366 days per request.',
    });
  }
  return { startDate, endDate, limit: parseLimit(query.limit) };
};

const missingResource = (code: string, title: string, detail: string): ApiError =>
  new ApiError({ statusCode: 404, code, title, detail });

export const registerSessionRoutes = async (
  app: FastifyInstance,
  dependencies: {
    readonly sessions: SessionRepository;
    readonly workouts: WorkoutRepository;
  },
): Promise<void> => {
  app.post(
    '/v1/workout-sessions',
    {
      preHandler: requireUser,
      schema: {
        body: CreateWorkoutSessionRequestSchema,
        response: { 201: WorkoutSessionResponseSchema },
      },
    },
    async (request, reply) => {
      const auth = requestAuth(request);
      const body = request.body as Static<typeof CreateWorkoutSessionRequestSchema>;
      const workout = await dependencies.workouts.get(
        auth.userId,
        body.workoutId,
        auth.accessToken,
      );
      if (workout === null) {
        throw missingResource(
          'workout_not_found',
          'Workout not found',
          'The requested workout is not available.',
        );
      }
      const session = await dependencies.sessions.createWorkoutSession({
        userId: auth.userId,
        workout,
        clientRequestId: body.clientRequestId,
        accessToken: auth.accessToken,
      });
      return reply.status(201).send({ data: session });
    },
  );

  app.get<{ Querystring: SessionListQuery }>(
    '/v1/workout-sessions',
    {
      preHandler: requireUser,
      schema: {
        querystring: SessionListQuerySchema,
        response: { 200: WorkoutSessionListResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      return dependencies.sessions.listWorkoutSessions(
        auth.userId,
        parseLimit(request.query.limit),
        request.query.cursor,
        auth.accessToken,
      );
    },
  );

  app.get<{ Params: SessionIdParams }>(
    '/v1/workout-sessions/:sessionId/exercise-sessions',
    {
      preHandler: requireUser,
      schema: {
        params: SessionIdParamsSchema,
        response: { 200: ExerciseSessionListResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      return {
        data: await dependencies.sessions.listExerciseSessions(
          auth.userId,
          request.params.sessionId,
          auth.accessToken,
        ),
      };
    },
  );

  app.get<{ Params: SessionIdParams }>(
    '/v1/workout-sessions/:sessionId',
    {
      preHandler: requireUser,
      schema: { params: SessionIdParamsSchema, response: { 200: WorkoutSessionResponseSchema } },
    },
    async (request) => {
      const auth = requestAuth(request);
      const session = await dependencies.sessions.getWorkoutSession(
        auth.userId,
        request.params.sessionId,
        auth.accessToken,
      );
      if (session === null) {
        throw missingResource(
          'workout_session_not_found',
          'Workout session not found',
          'The requested workout session is not available.',
        );
      }
      return { data: session };
    },
  );

  app.patch<{ Params: SessionIdParams }>(
    '/v1/workout-sessions/:sessionId',
    {
      preHandler: requireUser,
      schema: {
        params: SessionIdParamsSchema,
        body: PatchWorkoutSessionRequestSchema,
        response: { 200: WorkoutSessionResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      return {
        data: await dependencies.sessions.patchWorkoutSession(
          auth.userId,
          request.params.sessionId,
          request.body as Static<typeof PatchWorkoutSessionRequestSchema>,
          auth.accessToken,
        ),
      };
    },
  );

  app.post<{ Params: SessionIdParams }>(
    '/v1/workout-sessions/:sessionId/complete',
    {
      preHandler: requireUser,
      schema: {
        params: SessionIdParamsSchema,
        body: CompleteSessionRequestSchema,
        response: { 200: WorkoutSessionResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      const body = request.body as Static<typeof CompleteSessionRequestSchema>;
      return {
        data: await dependencies.sessions.completeWorkoutSession(
          auth.userId,
          request.params.sessionId,
          body.expectedVersion,
          body.endReason,
          auth.accessToken,
        ),
      };
    },
  );

  app.delete<{ Params: SessionIdParams }>(
    '/v1/workout-sessions/:sessionId',
    {
      preHandler: requireUser,
      schema: { params: SessionIdParamsSchema },
    },
    async (request, reply) => {
      const auth = requestAuth(request);
      await dependencies.sessions.deleteWorkoutSession(
        auth.userId,
        request.params.sessionId,
        auth.accessToken,
      );
      return reply.status(204).send();
    },
  );

  app.get<{ Params: ExerciseSessionIdParams }>(
    '/v1/exercise-sessions/:exerciseSessionId',
    {
      preHandler: requireUser,
      schema: {
        params: ExerciseSessionIdParamsSchema,
        response: { 200: ExerciseSessionResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      const session = await dependencies.sessions.getExerciseSession(
        auth.userId,
        request.params.exerciseSessionId,
        auth.accessToken,
      );
      if (session === null) {
        throw missingResource(
          'exercise_session_not_found',
          'Exercise session not found',
          'The requested exercise session is not available.',
        );
      }
      return { data: session };
    },
  );

  app.patch<{ Params: ExerciseSessionIdParams }>(
    '/v1/exercise-sessions/:exerciseSessionId',
    {
      preHandler: requireUser,
      schema: {
        params: ExerciseSessionIdParamsSchema,
        body: PatchExerciseSessionRequestSchema,
        response: { 200: ExerciseSessionResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      return {
        data: await dependencies.sessions.patchExerciseSession(
          auth.userId,
          request.params.exerciseSessionId,
          request.body as Static<typeof PatchExerciseSessionRequestSchema>,
          auth.accessToken,
        ),
      };
    },
  );

  app.post<{ Params: ExerciseSessionIdParams }>(
    '/v1/exercise-sessions/:exerciseSessionId/metrics',
    {
      preHandler: requireUser,
      schema: {
        params: ExerciseSessionIdParamsSchema,
        body: MetricBatchRequestSchema,
        response: { 200: MetricBatchResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      return {
        data: await dependencies.sessions.ingestMetricBatch(
          auth.userId,
          request.params.exerciseSessionId,
          request.body as Static<typeof MetricBatchRequestSchema>,
          auth.accessToken,
        ),
      };
    },
  );

  app.post<{ Params: ExerciseSessionIdParams }>(
    '/v1/exercise-sessions/:exerciseSessionId/complete',
    {
      preHandler: requireUser,
      schema: {
        params: ExerciseSessionIdParamsSchema,
        body: CompleteSessionRequestSchema,
        response: { 200: ExerciseAnalysisResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      const body = request.body as Static<typeof CompleteSessionRequestSchema>;
      return {
        data: await dependencies.sessions.completeExerciseSession(
          auth.userId,
          request.params.exerciseSessionId,
          body.expectedVersion,
          auth.accessToken,
        ),
      };
    },
  );

  app.get<{ Params: ExerciseSessionIdParams }>(
    '/v1/exercise-sessions/:exerciseSessionId/analysis',
    {
      preHandler: requireUser,
      schema: {
        params: ExerciseSessionIdParamsSchema,
        response: { 200: ExerciseAnalysisResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      return {
        data: await dependencies.sessions.getExerciseAnalysis(
          auth.userId,
          request.params.exerciseSessionId,
          auth.accessToken,
        ),
      };
    },
  );

  app.get(
    '/v1/progress/summary',
    {
      preHandler: requireUser,
      schema: { response: { 200: ProgressSummaryResponseSchema } },
    },
    async (request) => {
      const auth = requestAuth(request);
      return {
        data: await dependencies.sessions.getProgressSummary(auth.userId, auth.accessToken),
      };
    },
  );

  app.get<{ Querystring: ActivityQuery }>(
    '/v1/progress/activity',
    {
      preHandler: requireUser,
      schema: {
        querystring: ActivityQuerySchema,
        response: { 200: ProgressActivityResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      const range = activityRange(request.query);
      return dependencies.sessions.listProgressActivity(
        auth.userId,
        range.startDate,
        range.endDate,
        range.limit,
        request.query.cursor,
        auth.accessToken,
      );
    },
  );

  app.get<{ Params: ExerciseIdParams }>(
    '/v1/progress/exercises/:exerciseId',
    {
      preHandler: requireUser,
      schema: {
        params: ExerciseIdParamsSchema,
        response: { 200: ExerciseProgressResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      return {
        data: await dependencies.sessions.getExerciseProgress(
          auth.userId,
          request.params.exerciseId,
          auth.accessToken,
        ),
      };
    },
  );
};
