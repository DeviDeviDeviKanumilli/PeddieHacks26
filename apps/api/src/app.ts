import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { HealthResponseSchema, ReadyResponseSchema } from '@peddie/contracts';
import { createClient } from '@supabase/supabase-js';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  type AuthVerifier,
  authenticateRequest,
  RejectingAuthVerifier,
  SupabaseAuthVerifier,
} from './auth.js';
import {
  type CatalogRepository,
  MemoryCatalogRepository,
  type MovementProfileRepository,
  SupabaseCatalogRepository,
} from './catalog-repository.js';
import { type AppConfig, loadConfig } from './config.js';
import { registerErrorHandling } from './errors.js';
import { SupabaseMovementProfileRepository } from './profile-repository.js';
import { registerCatalogRoutes } from './routes/catalog.js';
import { registerProfileRoutes } from './routes/profile.js';
import { registerWorkoutRoutes } from './routes/workouts.js';
import {
  MemoryWorkoutRepository,
  SupabaseWorkoutRepository,
  type WorkoutRepository,
} from './workout-repository.js';

export type AppOptions = {
  logger?: boolean;
  config?: AppConfig;
  catalog?: CatalogRepository;
  profiles?: MovementProfileRepository;
  workouts?: WorkoutRepository;
  authVerifier?: AuthVerifier;
};

export const buildApp = async (options: AppOptions = {}): Promise<FastifyInstance> => {
  const config = options.config ?? loadConfig();
  const hasSupabase = config.supabaseUrl !== undefined && config.supabaseAnonKey !== undefined;
  const supabase = hasSupabase
    ? createClient(config.supabaseUrl, config.supabaseAnonKey)
    : undefined;
  const memoryRepository = new MemoryCatalogRepository();
  const catalog =
    options.catalog ??
    (supabase === undefined ? memoryRepository : new SupabaseCatalogRepository(supabase));
  const profiles =
    options.profiles ??
    (supabase === undefined ? memoryRepository : new SupabaseMovementProfileRepository(supabase));
  const workouts =
    options.workouts ??
    (supabase === undefined
      ? new MemoryWorkoutRepository()
      : new SupabaseWorkoutRepository(supabase));
  const authVerifier =
    options.authVerifier ??
    (supabase === undefined ? new RejectingAuthVerifier() : new SupabaseAuthVerifier(supabase));
  const app = Fastify({
    logger: options.logger ?? true,
    requestIdHeader: 'x-request-id',
  });

  await app.register(cors, {
    origin: config.corsOrigins,
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
  });
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Adaptive Fitness API',
        description: 'Backend contracts for adaptive general-wellness fitness.',
        version: '0.1.0',
      },
      tags: [
        { name: 'system', description: 'Health and readiness checks.' },
        { name: 'catalog', description: 'Public references and reviewed exercises.' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  app.decorateRequest('userId', null);
  app.addHook('onRequest', async (request) => authenticateRequest(request, authVerifier));
  registerErrorHandling(app);

  app.get(
    '/healthz',
    {
      schema: {
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async () => ({ data: { service: 'api' as const, status: 'ok' as const } }),
  );

  app.get('/readyz', { schema: { response: { 200: ReadyResponseSchema } } }, async () => ({
    data: { service: 'api' as const, status: 'ready' as const },
  }));

  await registerCatalogRoutes(app, { catalog, profiles });
  await registerProfileRoutes(app, { profiles });
  await registerWorkoutRoutes(app, { catalog, profiles, workouts });

  app.get('/openapi.json', async () => app.swagger());

  return app;
};
