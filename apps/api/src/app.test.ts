import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { AuthVerifier } from './auth.js';

const testAuthVerifier: AuthVerifier = {
  async verify(accessToken) {
    return accessToken === 'demo-token' ? '20000000-0000-4000-8000-000000000001' : null;
  },
};

describe('API health', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('reports that the API is healthy', async () => {
    app = await buildApp({ logger: false });
    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { service: 'api', status: 'ok' } });
  });

  it('publishes an OpenAPI document for the backend routes', async () => {
    app = await buildApp({ logger: false });
    const response = await app.inject({ method: 'GET', url: '/openapi.json' });

    expect(response.statusCode).toBe(200);
    expect(response.json().openapi).toBe('3.1.0');
    expect(response.json().paths['/v1/exercises']).toBeDefined();
  });

  it('serves public reference data and paginated exercises', async () => {
    app = await buildApp({ logger: false });
    const references = await app.inject({ method: 'GET', url: '/v1/reference-data' });
    const exercises = await app.inject({ method: 'GET', url: '/v1/exercises?limit=1' });

    expect(references.statusCode).toBe(200);
    expect(references.json().data.bodyRegions.length).toBeGreaterThan(0);
    expect(exercises.statusCode).toBe(200);
    expect(exercises.json().data).toHaveLength(1);
    expect(exercises.json().page.hasMore).toBe(true);
    expect(typeof exercises.json().page.nextCursor).toBe('string');
  });

  it('returns a typed error envelope for missing resources', async () => {
    app = await buildApp({ logger: false });
    const response = await app.inject({ method: 'GET', url: '/v1/exercises/not-an-exercise' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'exercise_not_found',
      status: 404,
      requestId: expect.any(String),
    });
  });

  it('protects compatibility and accepts a valid bearer token', async () => {
    app = await buildApp({ logger: false, authVerifier: testAuthVerifier });
    const exerciseId = '00000000-0000-4000-8000-000000000001';
    const unauthorized = await app.inject({
      method: 'GET',
      url: `/v1/exercises/${exerciseId}/compatibility`,
    });
    const authorized = await app.inject({
      method: 'GET',
      url: `/v1/exercises/${exerciseId}/compatibility`,
      headers: { authorization: 'Bearer demo-token' },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json().data.exerciseId).toBe(exerciseId);
  });

  it('rejects a limit outside the public pagination contract', async () => {
    app = await buildApp({ logger: false });
    const response = await app.inject({ method: 'GET', url: '/v1/exercises?limit=101' });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('invalid_limit');
  });
});
