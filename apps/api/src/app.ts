import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { HealthResponseSchema, ReadyResponseSchema } from '@peddie/contracts';
import { createClient } from '@supabase/supabase-js';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  type AccountRepository,
  MemoryAccountRepository,
  SupabaseAccountRepository,
  UnavailableAccountRepository,
} from './account-repository.js';
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
import { PrismaCatalogRepository } from './prisma-catalog-repository.js';
import { createPrismaClient } from './prisma-client.js';
import { PrismaMovementProfileRepository } from './prisma-profile-repository.js';
import { PrismaUserRepository } from './prisma-user-repository.js';
import { SupabaseMovementProfileRepository } from './profile-repository.js';
import {
  MemoryReadinessCheck,
  PrismaReadinessCheck,
  type ReadinessCheck,
  SupabaseReadinessCheck,
} from './readiness.js';
import { registerCatalogRoutes } from './routes/catalog.js';
import { registerProfileRoutes } from './routes/profile.js';
import { registerSessionRoutes } from './routes/sessions.js';
import { registerUserRoutes } from './routes/users.js';
import { registerWorkoutRoutes } from './routes/workouts.js';
import {
  MemorySessionRepository,
  type SessionRepository,
  SupabaseSessionRepository,
} from './session-repository.js';
import { createSupabaseClientFactory } from './supabase-client.js';
import {
  MemoryUserRepository,
  SupabaseUserRepository,
  type UserRepository,
} from './user-repository.js';
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
  users?: UserRepository;
  sessions?: SessionRepository;
  accounts?: AccountRepository;
  readiness?: ReadinessCheck;
  authVerifier?: AuthVerifier;
};

export const buildApp = async (options: AppOptions = {}): Promise<FastifyInstance> => {
  const config = options.config ?? loadConfig();
  const hasSupabase = config.supabaseUrl !== undefined && config.supabaseAnonKey !== undefined;
  const supabaseFactory = hasSupabase
    ? createSupabaseClientFactory(config.supabaseUrl, config.supabaseAnonKey)
    : undefined;
  const supabase = supabaseFactory?.();
  const prisma =
    config.databaseUrl === undefined ? undefined : createPrismaClient(config.databaseUrl);
  const serviceSupabase =
    hasSupabase && config.supabaseServiceRoleKey !== undefined
      ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        })
      : undefined;
  const memoryRepository = new MemoryCatalogRepository();
  const catalog =
    options.catalog ??
    (prisma !== undefined
      ? new PrismaCatalogRepository(prisma)
      : supabase === undefined
        ? memoryRepository
        : new SupabaseCatalogRepository(supabase));
  const profiles =
    options.profiles ??
    (prisma !== undefined
      ? new PrismaMovementProfileRepository(prisma)
      : supabase === undefined
        ? memoryRepository
        : new SupabaseMovementProfileRepository(supabase, supabaseFactory));
  const workouts =
    options.workouts ??
    (supabase === undefined
      ? new MemoryWorkoutRepository()
      : new SupabaseWorkoutRepository(supabase, supabaseFactory));
  const users =
    options.users ??
    (prisma !== undefined
      ? new PrismaUserRepository(prisma)
      : supabase === undefined
        ? new MemoryUserRepository()
        : new SupabaseUserRepository(supabase, supabaseFactory));
  const sessions =
    options.sessions ??
    (supabase === undefined
      ? new MemorySessionRepository(catalog)
      : new SupabaseSessionRepository(supabase, supabaseFactory));
  const accounts =
    options.accounts ??
    (serviceSupabase !== undefined
      ? new SupabaseAccountRepository(serviceSupabase)
      : supabase === undefined
        ? new MemoryAccountRepository()
        : new UnavailableAccountRepository());
  const readiness =
    options.readiness ??
    (prisma !== undefined
      ? new PrismaReadinessCheck(prisma)
      : supabase === undefined
        ? new MemoryReadinessCheck()
        : new SupabaseReadinessCheck(supabase));
  const authVerifier =
    options.authVerifier ??
    (supabase === undefined ? new RejectingAuthVerifier() : new SupabaseAuthVerifier(supabase));
  const app = Fastify({
    logger: options.logger ?? true,
    requestIdHeader: 'x-request-id',
    ajv: { customOptions: { removeAdditional: false } },
  });
  if (prisma !== undefined) {
    app.addHook('onClose', async () => prisma.$disconnect());
  }

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
        { name: 'users', description: 'Authenticated profile and settings.' },
        { name: 'sessions', description: 'Workout execution, derived metrics, and progress.' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  app.decorateRequest('userId', null);
  app.decorateRequest('accessToken', null);
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

  app.get(
    '/readyz',
    { schema: { response: { 200: ReadyResponseSchema, 503: ReadyResponseSchema } } },
    async (_request, reply) => {
      try {
        await readiness.check();
        return { data: { service: 'api' as const, status: 'ready' as const } };
      } catch (error) {
        app.log.warn({ err: error }, 'readiness dependency check failed');
        return reply
          .status(503)
          .send({ data: { service: 'api' as const, status: 'degraded' as const } });
      }
    },
  );

  await registerCatalogRoutes(app, { catalog, profiles });
  await registerProfileRoutes(app, { profiles });
  await registerUserRoutes(app, { users, accounts });
  await registerWorkoutRoutes(app, { catalog, profiles, workouts });
  await registerSessionRoutes(app, { sessions, workouts });

  app.get('/openapi.json', async () => app.swagger());

  return app;
};
