import type { ExerciseRecipe, FeatureSample, FeedbackCode, MotionEvent } from './types.js';

export const inspectMotion = (recipe: ExerciseRecipe, feature: FeatureSample): MotionEvent[] => {
  if (feature.confidence < recipe.confidenceGate) return [];
  const codes: FeedbackCode[] = [];
  if (feature.rangeOfMotionDeg < recipe.minRomDeg) codes.push('range_of_motion_short');
  if (feature.stability > recipe.maxStability) codes.push('movement_jerky');
  if (Math.abs(feature.velocityDegPerSec) < recipe.minVelocity) codes.push('tempo_too_slow');
  if (feature.confidence < recipe.confidenceGate + 0.15) codes.push('low_tracking_confidence');
  return codes.map((code) => ({
    type: 'issue_code' as const,
    atMs: feature.atMs,
    exerciseId: recipe.exerciseId,
    payload: { code, priority: code === 'movement_jerky' ? 'high' : 'low' },
  }));
};
