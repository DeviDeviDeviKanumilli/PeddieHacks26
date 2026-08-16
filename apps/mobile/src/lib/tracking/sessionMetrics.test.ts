import {
  finiteJointAngle,
  type PoseRepRecord,
  poseRepToMetric,
  summarizePoseSession,
} from '@/lib/tracking/sessionMetrics';

describe('pose session metrics', () => {
  const reps: PoseRepRecord[] = [
    {
      setNumber: 1,
      repNumber: 1,
      counted: true,
      durationMs: 2400,
      rangeOfMotionDeg: 110,
      trackingConfidence: 0.82,
      targetPositionReached: true,
      accuracyScore: 92,
      controlScore: 84,
      stabilityScore: 88,
      formScore: 88,
      feedbackCodes: [],
      recordedOffsetMs: 2400,
    },
    {
      setNumber: 1,
      repNumber: 2,
      counted: true,
      durationMs: 7000,
      rangeOfMotionDeg: 90,
      trackingConfidence: 0.4,
      targetPositionReached: true,
      accuracyScore: 68,
      controlScore: 61,
      stabilityScore: 72,
      formScore: 67,
      feedbackCodes: ['low_tracking_confidence', 'tempo_too_slow'],
      recordedOffsetMs: 9400,
    },
  ];

  it('summarizes derived ROM without landmarks', () => {
    expect(summarizePoseSession(reps)).toEqual({
      counted: 2,
      meanRomDeg: 100,
      minRomDeg: 90,
      maxRomDeg: 110,
      meanConfidence: 0.61,
      targetReachedRate: 1,
      meanAccuracyScore: 80,
      meanControlScore: 72.5,
      meanStabilityScore: 80,
      meanFormScore: 77.5,
    });
  });

  it('copies only allowlisted metric fields', () => {
    const first = reps[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    const metric = poseRepToMetric(first);
    expect(metric).toEqual({
      setNumber: 1,
      repNumber: 1,
      counted: true,
      durationMs: 2400,
      rangeOfMotionDeg: 110,
      trackingConfidence: 0.82,
      targetPositionReached: true,
      accuracyScore: 92,
      controlScore: 84,
      stabilityScore: 88,
      formScore: 88,
      feedbackCodes: [],
      recordedOffsetMs: 2400,
    });
    expect(JSON.stringify(metric)).not.toMatch(/video|image|audio|landmark|coordinate/iu);
  });

  it('drops invalid native angles instead of persisting them', () => {
    expect(finiteJointAngle(90)).toBe(90);
    expect(finiteJointAngle(undefined)).toBeNull();
    expect(finiteJointAngle(-1)).toBeNull();
    expect(finiteJointAngle(181)).toBeNull();
  });
});
