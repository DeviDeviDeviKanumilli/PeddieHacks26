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
  bodyRegions: {},
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
    left_single_leg_balance: 'available',
    right_single_leg_balance: 'available',
  },
  equipmentIds: ['dumbbells', 'resistance_band', 'stable-chair', 'wall', 'exercise-mat'],
  goalIds: ['upper_body', 'strength'],
  intensityPreference: 'standard',
};

describe('session, metrics, and progress routes', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('runs a derived-metric exercise session with idempotent batches', async () => {
    app = await buildApp({ logger: false, authVerifier });
    const headers = { authorization: 'Bearer demo-token' };
    await app.inject({ method: 'PUT', url: '/v1/movement-profile', headers, payload: profile });
    const workoutResponse = await app.inject({
      method: 'POST',
      url: '/v1/workouts',
      headers,
      payload: {
        clientRequestId: '30000000-0000-4000-8000-000000000010',
        title: 'Session test',
        items: [
          {
            exerciseId: '00000000-0000-4000-8000-000000000001',
            sets: 1,
            reps: 2,
            restSeconds: 30,
          },
        ],
      },
    });
    const workoutId = workoutResponse.json().data.id as string;
    const created = await app.inject({
      method: 'POST',
      url: '/v1/workout-sessions',
      headers,
      payload: {
        clientRequestId: '30000000-0000-4000-8000-000000000011',
        workoutId,
      },
    });
    const sessionId = created.json().data.id as string;
    const exerciseSessions = await app.inject({
      method: 'GET',
      url: `/v1/workout-sessions/${sessionId}/exercise-sessions`,
      headers,
    });
    const exerciseSessionId = exerciseSessions.json().data[0].id as string;
    const started = await app.inject({
      method: 'PATCH',
      url: `/v1/exercise-sessions/${exerciseSessionId}`,
      headers,
      payload: { expectedVersion: 1, state: 'active' },
    });
    const batch = {
      batchId: '30000000-0000-4000-8000-000000000012',
      metrics: [
        {
          setNumber: 1,
          repNumber: 1,
          counted: true,
          durationMs: 2000,
          rangeOfMotionDeg: 90,
          targetPositionReached: true,
          accuracyScore: 100,
          controlScore: 90,
          stabilityScore: 95,
          formScore: 90,
          trackingConfidence: 0.9,
          feedbackCodes: [],
        },
        {
          setNumber: 1,
          repNumber: 2,
          counted: true,
          durationMs: 2200,
          rangeOfMotionDeg: 92,
          targetPositionReached: true,
          accuracyScore: 100,
          controlScore: 88,
          stabilityScore: 94,
          formScore: 89,
          trackingConfidence: 0.9,
          feedbackCodes: [],
        },
      ],
    };
    const ingested = await app.inject({
      method: 'POST',
      url: `/v1/exercise-sessions/${exerciseSessionId}/metrics`,
      headers,
      payload: batch,
    });
    const replay = await app.inject({
      method: 'POST',
      url: `/v1/exercise-sessions/${exerciseSessionId}/metrics`,
      headers,
      payload: batch,
    });
    const completed = await app.inject({
      method: 'POST',
      url: `/v1/exercise-sessions/${exerciseSessionId}/complete`,
      headers,
      payload: { expectedVersion: started.json().data.version },
    });
    const workoutCompleted = await app.inject({
      method: 'POST',
      url: `/v1/workout-sessions/${sessionId}/complete`,
      headers,
      payload: { expectedVersion: created.json().data.version },
    });
    const progress = await app.inject({ method: 'GET', url: '/v1/progress/summary', headers });

    expect(workoutResponse.statusCode).toBe(201);
    expect(created.statusCode).toBe(201);
    expect(exerciseSessions.statusCode).toBe(200);
    expect(started.statusCode).toBe(200);
    expect(ingested.statusCode).toBe(200);
    expect(ingested.json().data).toEqual({ acceptedCount: 2, duplicateCount: 0, rejectedCount: 0 });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().data).toEqual({ acceptedCount: 0, duplicateCount: 2, rejectedCount: 0 });
    expect(completed.statusCode).toBe(200);
    expect(completed.json().data.completion).toMatchObject({
      countedReps: 2,
      targetReps: 2,
      percentage: 100,
    });
    expect(workoutCompleted.statusCode).toBe(200);
    expect(workoutCompleted.json().data.state).toBe('completed');
    expect(progress.statusCode).toBe(200);
    expect(progress.json().data).toMatchObject({ totalExercises: 1, totalSets: 1, totalReps: 2 });
  });

  it('rejects raw pose fields and invalid progress ranges', async () => {
    app = await buildApp({ logger: false, authVerifier });
    const headers = { authorization: 'Bearer demo-token' };
    const rawMetric = await app.inject({
      method: 'POST',
      url: '/v1/exercise-sessions/00000000-0000-4000-8000-000000000099/metrics',
      headers,
      payload: {
        batchId: '30000000-0000-4000-8000-000000000013',
        metrics: [{ setNumber: 1, repNumber: 1, counted: true, feedbackCodes: [], landmarks: [] }],
      },
    });
    const tooWide = await app.inject({
      method: 'GET',
      url: '/v1/progress/activity?startDate=2024-01-01&endDate=2025-01-02',
      headers,
    });

    expect(rawMetric.statusCode).toBe(400);
    expect(rawMetric.json().code).toBe('invalid_request');
    expect(tooWide.statusCode).toBe(400);
    expect(tooWide.json().code).toBe('date_range_too_large');
  });
});
