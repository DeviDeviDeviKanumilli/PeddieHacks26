import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { AuthVerifier } from './auth.js';

const authVerifier: AuthVerifier = {
  async verify(token) {
    return token === 'demo-token' ? '20000000-0000-4000-8000-000000000001' : null;
  },
};

const profile = {
  expectedVersion: 1,
  bodyRegions: { shoulders: 'focus' },
  capabilities: {
    seated_posture: 'available',
    standing: 'available',
    standing_balance: 'available',
    floor_transfer: 'available',
    supine: 'available',
    prone: 'available',
    overhead_reach: 'available',
    torso_rotation: 'available',
    left_grip: 'available',
    right_grip: 'available',
    left_upper_body_weight_bearing: 'available',
    right_upper_body_weight_bearing: 'available',
    left_lower_body_weight_bearing: 'available',
    right_lower_body_weight_bearing: 'available',
  },
  equipmentIds: ['dumbbells', 'resistance_band', 'stable-chair', 'wall', 'exercise-mat'],
  goalIds: ['upper_body', 'strength'],
  intensityPreference: 'standard',
};

describe('profile and workout routes', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('updates movement profiles with optimistic concurrency', async () => {
    app = await buildApp({ logger: false, authVerifier });
    const headers = { authorization: 'Bearer demo-token' };
    const initial = await app.inject({ method: 'GET', url: '/v1/movement-profile', headers });
    const updated = await app.inject({
      method: 'PUT',
      url: '/v1/movement-profile',
      headers,
      payload: profile,
    });
    const stale = await app.inject({
      method: 'PUT',
      url: '/v1/movement-profile',
      headers,
      payload: { ...profile, expectedVersion: 1 },
    });

    expect(initial.statusCode).toBe(200);
    expect(initial.json().data.version).toBe(1);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data.version).toBe(2);
    expect(stale.statusCode).toBe(409);
    expect(stale.json().code).toBe('version_conflict');
  });

  it('generates, idempotently replays, lists, patches, and archives a workout', async () => {
    app = await buildApp({ logger: false, authVerifier });
    const headers = { authorization: 'Bearer demo-token' };
    await app.inject({
      method: 'PUT',
      url: '/v1/movement-profile',
      headers,
      payload: profile,
    });
    const payload = {
      clientRequestId: '30000000-0000-4000-8000-000000000001',
      durationMinutes: 5,
      primaryRegionIds: ['shoulders'],
    };
    const generated = await app.inject({
      method: 'POST',
      url: '/v1/workouts/generate',
      headers,
      payload,
    });
    const replay = await app.inject({
      method: 'POST',
      url: '/v1/workouts/generate',
      headers,
      payload,
    });
    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/workouts/generate',
      headers,
      payload: { ...payload, durationMinutes: 10 },
    });
    const workoutId = generated.json().data.workoutId as string;
    const listed = await app.inject({ method: 'GET', url: '/v1/workouts', headers });
    const patched = await app.inject({
      method: 'PATCH',
      url: `/v1/workouts/${workoutId}`,
      headers,
      payload: { expectedVersion: 1, title: 'My adaptive workout' },
    });
    const archived = await app.inject({
      method: 'DELETE',
      url: `/v1/workouts/${workoutId}`,
      headers,
    });

    expect(generated.statusCode).toBe(201);
    expect(generated.json().data.items).toHaveLength(3);
    expect(replay.statusCode).toBe(201);
    expect(replay.json().data.workoutId).toBe(workoutId);
    expect(conflict.statusCode).toBe(409);
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data[0].id).toBe(workoutId);
    expect(patched.statusCode).toBe(200);
    expect(patched.json().data.version).toBe(2);
    expect(archived.statusCode).toBe(200);
    expect(archived.json().data.status).toBe('archived');
  });

  it('rejects manual caution exercises without exact warning acknowledgements', async () => {
    app = await buildApp({ logger: false, authVerifier });
    const headers = { authorization: 'Bearer demo-token' };
    await app.inject({
      method: 'PUT',
      url: '/v1/movement-profile',
      headers,
      payload: { ...profile, bodyRegions: { upper_arms: 'limited' } },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/v1/workouts',
      headers,
      payload: {
        clientRequestId: '30000000-0000-4000-8000-000000000002',
        title: 'Manual plan',
        items: [
          {
            exerciseId: '00000000-0000-4000-8000-000000000001',
            sets: 1,
            reps: 8,
            restSeconds: 30,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().code).toBe('caution_acknowledgement_required');
  });
});
