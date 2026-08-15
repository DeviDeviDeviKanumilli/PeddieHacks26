import cors from '@fastify/cors';
import { HealthResponseSchema } from '@peddie/contracts';
import Fastify, { type FastifyInstance } from 'fastify';

export type AppOptions = {
  logger?: boolean;
};

export const buildApp = async (options: AppOptions = {}): Promise<FastifyInstance> => {
  const app = Fastify({ logger: options.logger ?? true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? true,
  });

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

  app.get('/readyz', async () => ({ data: { service: 'api', status: 'ready' } }));

  return app;
};
