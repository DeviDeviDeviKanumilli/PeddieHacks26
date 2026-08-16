// closed codes only. this is not a form coach, just threshold checks on the window.
import type { ExerciseRecipe, FeatureSample, FeedbackCode, MotionEvent } from './types.js';

export const inspectMotion = (recipe: ExerciseRecipe, feature: FeatureSample): MotionEvent[] => {
  if (feature.confidence < recipe.confidenceGate) return []; // garbage in, nothing out
  const codes: FeedbackCode[] = [];
  if (feature.rangeOfMotionDeg < recipe.minRomDeg) codes.push('range_of_motion_short');
  if (feature.stability > recipe.maxStability) codes.push('movement_jerky');
  if (Math.abs(feature.velocityDegPerSec) < recipe.minVelocity) codes.push('tempo_too_slow');
  // maxVelocity sits on the recipe for calibration. we do not emit a code for going too fast.
  // still above the gate, but close enough that the overlay should look uncertain
  if (feature.confidence < recipe.confidenceGate + 0.15) codes.push('low_tracking_confidence');
  return codes.map((code) => ({
    type: 'issue_code' as const,
    atMs: feature.atMs,
    exerciseId: recipe.exerciseId,
    payload: { code, priority: code === 'movement_jerky' ? 'high' : 'low' }, // jerky is the only high one for now
  }));
};
