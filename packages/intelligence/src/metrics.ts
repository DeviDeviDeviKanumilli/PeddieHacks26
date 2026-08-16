// what may leave the device. anything else gets dropped, not rewritten.
import type { FeedbackCode } from './types.js';
import { FEEDBACK_CODES, FORBIDDEN_PAYLOAD_KEYS } from './types.js';

export type DerivedMetric = {
  exerciseId: string;
  setIndex: number;
  acceptedReps: number;
  elapsedMs: number;
  nativeInference: boolean;
  rangeOfMotionDeg?: number; // only when nativeInference is true
  trackingConfidence?: number;
  feedbackCodes: readonly FeedbackCode[];
};

export const toAllowlistedMetric = (candidate: Record<string, unknown>): DerivedMetric | null => {
  for (const key of FORBIDDEN_PAYLOAD_KEYS) {
    if (key in candidate) return null; // one bad field and the whole row is out
  }
  if (typeof candidate.exerciseId !== 'string') return null;
  if (typeof candidate.setIndex !== 'number' || typeof candidate.acceptedReps !== 'number') {
    return null;
  }
  if (typeof candidate.elapsedMs !== 'number' || typeof candidate.nativeInference !== 'boolean') {
    return null;
  }
  // unknown codes are stripped, not rejected. keep the rest of the row if it is clean.
  const codes = Array.isArray(candidate.feedbackCodes)
    ? candidate.feedbackCodes.filter((code): code is FeedbackCode =>
        (FEEDBACK_CODES as readonly string[]).includes(String(code)),
      )
    : [];
  const metric: DerivedMetric = {
    exerciseId: candidate.exerciseId,
    setIndex: candidate.setIndex,
    acceptedReps: candidate.acceptedReps,
    elapsedMs: candidate.elapsedMs,
    nativeInference: candidate.nativeInference,
    feedbackCodes: codes,
  };
  // rom and confidence only travel with native inference. js-preview sessions omit them.
  if (
    candidate.nativeInference === true &&
    typeof candidate.rangeOfMotionDeg === 'number' &&
    typeof candidate.trackingConfidence === 'number'
  ) {
    return {
      ...metric,
      rangeOfMotionDeg: candidate.rangeOfMotionDeg,
      trackingConfidence: candidate.trackingConfidence,
    };
  }
  return metric;
};
