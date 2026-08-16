import type { FeedbackCode, RepMetric } from '@peddie/contracts';

export type PoseRepRecord = {
  setNumber: number;
  repNumber: number;
  counted: boolean;
  durationMs: number;
  rangeOfMotionDeg: number | null;
  trackingConfidence: number | null;
  targetPositionReached: boolean;
  accuracyScore: number | null;
  controlScore: number | null;
  stabilityScore: number | null;
  formScore: number | null;
  feedbackCodes: FeedbackCode[];
  recordedOffsetMs: number;
};

export type PoseSessionSummary = {
  counted: number;
  meanRomDeg: number | null;
  minRomDeg: number | null;
  maxRomDeg: number | null;
  meanConfidence: number | null;
  targetReachedRate: number | null;
  meanAccuracyScore: number | null;
  meanControlScore: number | null;
  meanStabilityScore: number | null;
  meanFormScore: number | null;
};

const round = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const summarizePoseSession = (reps: readonly PoseRepRecord[]): PoseSessionSummary => {
  const roms = reps
    .map((rep) => rep.rangeOfMotionDeg)
    .filter((value): value is number => value !== null);
  const confidences = reps
    .map((rep) => rep.trackingConfidence)
    .filter((value): value is number => value !== null);
  const reached = reps.filter((rep) => rep.targetPositionReached).length;
  const meanScore = (
    key: 'accuracyScore' | 'controlScore' | 'stabilityScore' | 'formScore',
  ): number | null => {
    const values = reps.map((rep) => rep[key]).filter((value): value is number => value !== null);
    return values.length === 0
      ? null
      : round(values.reduce((sum, value) => sum + value, 0) / values.length, 1);
  };
  return {
    counted: reps.filter((rep) => rep.counted).length,
    meanRomDeg:
      roms.length === 0
        ? null
        : round(roms.reduce((sum, value) => sum + value, 0) / roms.length, 1),
    minRomDeg: roms.length === 0 ? null : round(Math.min(...roms), 1),
    maxRomDeg: roms.length === 0 ? null : round(Math.max(...roms), 1),
    meanConfidence:
      confidences.length === 0
        ? null
        : round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length, 3),
    targetReachedRate: reps.length === 0 ? null : round(reached / reps.length, 3),
    meanAccuracyScore: meanScore('accuracyScore'),
    meanControlScore: meanScore('controlScore'),
    meanStabilityScore: meanScore('stabilityScore'),
    meanFormScore: meanScore('formScore'),
  };
};

export const poseRepToMetric = (rep: PoseRepRecord): RepMetric => ({
  setNumber: rep.setNumber,
  repNumber: rep.repNumber,
  counted: rep.counted,
  durationMs: rep.durationMs,
  feedbackCodes: rep.feedbackCodes,
  recordedOffsetMs: rep.recordedOffsetMs,
  ...(rep.rangeOfMotionDeg === null ? {} : { rangeOfMotionDeg: rep.rangeOfMotionDeg }),
  ...(rep.trackingConfidence === null ? {} : { trackingConfidence: rep.trackingConfidence }),
  targetPositionReached: rep.targetPositionReached,
  ...(rep.accuracyScore === null ? {} : { accuracyScore: rep.accuracyScore }),
  ...(rep.controlScore === null ? {} : { controlScore: rep.controlScore }),
  ...(rep.stabilityScore === null ? {} : { stabilityScore: rep.stabilityScore }),
  ...(rep.formScore === null ? {} : { formScore: rep.formScore }),
});

export const feedbackForRep = (input: {
  confidence: number | null;
  durationMs: number;
}): FeedbackCode[] => {
  const codes: FeedbackCode[] = [];
  if (input.confidence !== null && input.confidence < 0.6) codes.push('low_tracking_confidence');
  if (input.durationMs > 6000) codes.push('tempo_too_slow');
  return codes;
};

export const combinedRangeOfMotion = (left: number | null, right: number | null): number | null => {
  if (left === null && right === null) return null;
  if (left === null) return right;
  if (right === null) return left;
  return round((left + right) / 2, 1);
};

export const finiteJointAngle = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0 || value > 180) return null;
  return value;
};
