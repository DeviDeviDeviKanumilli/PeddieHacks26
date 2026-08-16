import {
  finiteJointAngle,
  type PoseRepRecord,
  poseRepToMetric,
  summarizePoseSession,
} from '@/lib/tracking/sessionMetrics';

// allowlisted derived fields only. nothing with landmarks or media.

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
      feedbackCodes: ['low_tracking_confidence', 'tempo_too_slow'],
      recordedOffsetMs: 9400,
    },
  ];

  it('summarizes derived ROM without landmarks', () => {
    // summary is for the complete screen, not an api payload.
    expect(summarizePoseSession(reps)).toEqual({
      counted: 2,
      meanRomDeg: 100,
      minRomDeg: 90,
      maxRomDeg: 110,
      meanConfidence: 0.61,
      targetReachedRate: 1,
    });
  });

  it('copies only allowlisted metric fields', () => {
    // live ingest rejects video/image/audio/landmark keys.
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
      feedbackCodes: [],
      recordedOffsetMs: 2400,
    });
    expect(JSON.stringify(metric)).not.toMatch(/video|image|audio|landmark|coordinate/iu);
  });

  it('drops invalid native angles instead of persisting them', () => {
    // 0-180 is the analyzer contract; junk from native should become null.
    expect(finiteJointAngle(90)).toBe(90);
    expect(finiteJointAngle(undefined)).toBeNull();
    expect(finiteJointAngle(-1)).toBeNull();
    expect(finiteJointAngle(181)).toBeNull();
  });
});
