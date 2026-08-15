import { buildApp } from '../apps/api/src/app.js';

const requiredPaths = [
  '/healthz',
  '/readyz',
  '/v1/reference-data',
  '/v1/exercises',
  '/v1/movement-profile',
  '/v1/users/me',
  '/v1/settings',
  '/v1/workouts',
  '/v1/workout-sessions',
  '/v1/exercise-sessions/{exerciseSessionId}/metrics',
  '/v1/progress/summary',
] as const;

const main = async (): Promise<void> => {
  const app = await buildApp({ logger: false });
  try {
    const response = await app.inject({ method: 'GET', url: '/openapi.json' });
    if (response.statusCode !== 200) {
      throw new Error(`OpenAPI endpoint returned ${response.statusCode}.`);
    }
    const document = response.json() as {
      readonly openapi?: unknown;
      readonly paths?: Record<string, unknown>;
    };
    if (document.openapi !== '3.1.0') {
      throw new Error('OpenAPI document is not version 3.1.0.');
    }
    for (const path of requiredPaths) {
      if (document.paths?.[path] === undefined) {
        throw new Error(`OpenAPI document is missing ${path}.`);
      }
    }
  } finally {
    await app.close();
  }

  console.log(`OpenAPI check passed for ${requiredPaths.length} required paths.`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
