import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { AuthVerifier } from './auth.js';
import { loadConfig } from './config.js';

const authVerifier: AuthVerifier = {
  async verify(token) {
    return token === 'demo-token' ? '20000000-0000-4000-8000-000000000001' : null;
  },
};

describe('user profile and settings routes', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('reads and patches the signed-in user profile', async () => {
    app = await buildApp({ logger: false, authVerifier });
    const headers = { authorization: 'Bearer demo-token' };
    const initial = await app.inject({ method: 'GET', url: '/v1/users/me', headers });
    const updated = await app.inject({
      method: 'PATCH',
      url: '/v1/users/me',
      headers,
      payload: {
        displayName: 'Adaptive athlete',
        timezone: 'America/New_York',
        experienceLevel: 'intermediate',
      },
    });

    expect(initial.statusCode).toBe(200);
    expect(initial.json().data).toMatchObject({
      userId: '20000000-0000-4000-8000-000000000001',
      displayName: null,
      experienceLevel: 'beginner',
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data).toMatchObject({
      displayName: 'Adaptive athlete',
      timezone: 'America/New_York',
      experienceLevel: 'intermediate',
      intensityPreference: 'standard',
    });
  });

  it('merges nested settings patches and rejects unauthenticated access', async () => {
    app = await buildApp({ logger: false, authVerifier });
    const unauthorized = await app.inject({ method: 'GET', url: '/v1/settings' });
    const headers = { authorization: 'Bearer demo-token' };
    const updated = await app.inject({
      method: 'PATCH',
      url: '/v1/settings',
      headers,
      payload: {
        accessibilityPreferences: { reducedMotion: true, largerText: true },
        feedbackPreferences: { spokenFeedback: true, detailLevel: 'detailed' },
        defaultRestDurationSeconds: 90,
      },
    });
    const current = await app.inject({ method: 'GET', url: '/v1/settings', headers });

    expect(unauthorized.statusCode).toBe(401);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data).toMatchObject({
      accessibilityPreferences: { reducedMotion: true, largerText: true },
      feedbackPreferences: { spokenFeedback: true, detailLevel: 'detailed' },
      poseOverlayEnabled: true,
      defaultRestDurationSeconds: 90,
    });
    expect(current.json().data.defaultRestDurationSeconds).toBe(90);
  });

  it('delegates account deletion and tolerates an adapter-level retry', async () => {
    app = await buildApp({ logger: false, authVerifier });
    const headers = { authorization: 'Bearer demo-token' };
    const first = await app.inject({ method: 'DELETE', url: '/v1/users/me', headers });
    const retry = await app.inject({ method: 'DELETE', url: '/v1/users/me', headers });

    expect(first.statusCode).toBe(204);
    expect(retry.statusCode).toBe(204);
  });

  it('applies the dedicated account-deletion rate limit', async () => {
    app = await buildApp({
      logger: false,
      authVerifier,
      config: loadConfig({ RATE_LIMIT_DELETION: '1', RATE_LIMIT_GENERAL: '100' }),
    });
    const headers = { authorization: 'Bearer demo-token' };
    const first = await app.inject({ method: 'DELETE', url: '/v1/users/me', headers });
    const limited = await app.inject({ method: 'DELETE', url: '/v1/users/me', headers });

    expect(first.statusCode).toBe(204);
    expect(limited.statusCode).toBe(429);
    expect(limited.json().code).toBe('rate_limit_exceeded');
  });
});
