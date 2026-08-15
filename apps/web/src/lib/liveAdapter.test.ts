import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from './api';
import {
  LiveAdapter,
  LiveAdapterMappingError,
  type LiveMovementProfile,
  LiveMutationUncertainError,
  type LiveProgressActivity,
  type LiveProgressSummary,
  type LiveRepMetric,
  mapLiveExerciseToUi,
  mapLiveMovementProfileToUi,
  mapLiveProgressToUi,
  mapUiMovementProfileToLiveUpdate,
  toLiveRepMetricPayload,
  UnsupportedLiveFeatureError,
} from './liveAdapter';

const createClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
});

const currentMovementProfile: LiveMovementProfile = {
  version: 4,
  bodyRegions: {
    shoulders: 'focus',
    upper_arms: 'limited',
    lower_back: 'avoid',
    left_knee: 'neutral',
    right_knee: 'neutral',
    head_neck: 'limited',
  },
  capabilities: {
    seated_posture: 'available',
    standing: 'limited',
  },
  equipmentIds: ['dumbbells', 'custom-grip'],
  goalIds: ['strength', 'custom-goal'],
  intensityPreference: 'low',
};

describe('live adapter mappings', () => {
  it('maps API profile IDs to UI labels and preserves hidden server state on writes', () => {
    expect(mapLiveMovementProfileToUi(currentMovementProfile)).toEqual({
      focusRegions: ['Shoulders'],
      avoidRegions: ['Lower Back'],
      equipment: ['Dumbbells', 'custom-grip'],
      goals: ['strength', 'custom-goal'],
      version: 4,
    });

    const update = mapUiMovementProfileToLiveUpdate(
      {
        focusRegions: ['Arms', 'Left Knee'],
        avoidRegions: ['Lower Back', 'Left Knee'],
        equipment: ['Bodyweight', 'Resistance Band'],
        goals: ['mobility'],
        version: 99,
      },
      currentMovementProfile,
    );

    expect(update).toMatchObject({
      expectedVersion: 4,
      capabilities: currentMovementProfile.capabilities,
      equipmentIds: ['resistance_band', 'custom-grip'],
      goalIds: ['mobility', 'custom-goal'],
      intensityPreference: 'low',
    });
    expect(update.bodyRegions.upper_arms).toBe('focus');
    expect(update.bodyRegions.left_knee).toBe('avoid');
    expect(update.bodyRegions.shoulders).toBe('neutral');
    expect(update.bodyRegions.head_neck).toBe('limited');
  });

  it('aggregates weekly progress and computes a coverage percentage', () => {
    const summary: LiveProgressSummary = {
      totalActiveSeconds: 900,
      totalExercises: 6,
      totalSets: 12,
      totalReps: 80,
      averageScore: 91.6,
      bodyCoverage: [
        { bodyRegionId: 'shoulders', intensity: 100 },
        { bodyRegionId: 'hips', intensity: 60 },
      ],
    };
    const activity: LiveProgressActivity[] = [
      {
        activityDate: '2026-08-14',
        sessionCount: 2,
        exerciseCount: 4,
        setCount: 7,
        repCount: 42,
        activeSeconds: 480,
        averageScore: 93,
      },
      {
        activityDate: '2026-08-13',
        sessionCount: 1,
        exerciseCount: 2,
        setCount: 5,
        repCount: 38,
        activeSeconds: 420,
        averageScore: 90,
      },
    ];

    expect(mapLiveProgressToUi(summary, activity, 4)).toEqual({
      totalSeconds: 900,
      exercisesCompleted: 6,
      totalReps: 80,
      totalSets: 12,
      bodyCoverage: 50,
      averageFormScore: 92,
      weeklyWorkouts: 3,
      weeklySeconds: 900,
      weeklyReps: 80,
      weeklySets: 12,
    });
  });

  it('requires reviewed presentation content for an API exercise summary', () => {
    expect(() =>
      mapLiveExerciseToUi(
        {
          id: 'exercise-id',
          slug: 'seated-biceps-curl',
          name: 'Seated biceps curl',
          summary: 'A supported arm exercise.',
          category: 'strength',
          position: 'seated',
          difficulty: 1,
          defaultPrescription: { sets: 2, reps: 10, restSeconds: 45 },
          trackingSupported: true,
          contentVersion: 1,
        },
        undefined,
      ),
    ).toThrowError(LiveAdapterMappingError);
  });

  it('copies only allowlisted derived metric fields', () => {
    const metric = {
      setNumber: 1,
      repNumber: 2,
      counted: true,
      feedbackCodes: [],
      formScore: 92,
      rawFrame: 'must-not-leave-the-browser',
      landmarks: [{ x: 0, y: 0 }],
    } as LiveRepMetric & { rawFrame: string; landmarks: unknown[] };

    expect(toLiveRepMetricPayload(metric)).toEqual({
      setNumber: 1,
      repNumber: 2,
      counted: true,
      feedbackCodes: [],
      formScore: 92,
    });
  });
});

describe('LiveAdapter HTTP choreography', () => {
  it('encodes catalog filters and injects an idempotency key for generation', async () => {
    const client = createClient();
    client.get.mockResolvedValue({ data: [], page: { nextCursor: null, hasMore: false } });
    client.post.mockResolvedValue({
      data: {
        workoutId: 'workout-id',
        source: 'generated',
        status: 'draft',
        version: 1,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        engineVersion: 'generation-v1',
        requestedDurationMinutes: 15,
        totalEstimatedSeconds: 900,
        items: [],
      },
    });
    const adapter = new LiveAdapter(
      client as unknown as ConstructorParameters<typeof LiveAdapter>[0],
      () => '00000000-0000-4000-8000-000000000123',
    );

    await adapter.listExercises({ search: 'seated curl', trackingSupported: true, limit: 25 });
    expect(client.get).toHaveBeenCalledWith(
      '/v1/exercises?search=seated+curl&trackingSupported=true&limit=25',
    );

    await adapter.generateWorkout({ durationMinutes: 15, goalIds: ['strength'] });
    expect(client.post).toHaveBeenCalledWith('/v1/workouts/generate', {
      durationMinutes: 15,
      goalIds: ['strength'],
      clientRequestId: '00000000-0000-4000-8000-000000000123',
    });
  });

  it('sanitizes metric objects again at the network boundary', async () => {
    const client = createClient();
    client.post.mockResolvedValue({
      data: { acceptedCount: 1, duplicateCount: 0, rejectedCount: 0 },
    });
    const adapter = new LiveAdapter(
      client as unknown as ConstructorParameters<typeof LiveAdapter>[0],
      () => '00000000-0000-4000-8000-000000000124',
    );
    const metric = {
      setNumber: 1,
      repNumber: 1,
      counted: true,
      feedbackCodes: [],
      cameraFrame: 'private',
    } as LiveRepMetric & { cameraFrame: string };

    await adapter.uploadDerivedMetrics('session/id', [metric]);

    expect(client.post).toHaveBeenCalledWith('/v1/exercise-sessions/session%2Fid/metrics', {
      batchId: '00000000-0000-4000-8000-000000000124',
      metrics: [
        {
          setNumber: 1,
          repNumber: 1,
          counted: true,
          feedbackCodes: [],
        },
      ],
    });
  });

  it('rejects email edits that the Fastify profile route cannot persist', async () => {
    const client = createClient();
    const adapter = new LiveAdapter(
      client as unknown as ConstructorParameters<typeof LiveAdapter>[0],
    );

    await expect(
      adapter.saveUserProfile(
        { displayName: 'Jordan Lee', email: 'new@example.com' },
        'current@example.com',
      ),
    ).rejects.toBeInstanceOf(UnsupportedLiveFeatureError);
    expect(client.patch).not.toHaveBeenCalled();
  });

  it('marks the hosted archive response as uncertain instead of inviting a blind retry', async () => {
    const client = createClient();
    client.request.mockRejectedValue(
      new ApiClientError('The archived workout could not be loaded.', 503, {
        code: 'dependency_unavailable',
        detail: 'The archived workout could not be loaded.',
      }),
    );
    const adapter = new LiveAdapter(
      client as unknown as ConstructorParameters<typeof LiveAdapter>[0],
    );

    await expect(adapter.archiveWorkout('workout-id')).rejects.toBeInstanceOf(
      LiveMutationUncertainError,
    );
  });
});
