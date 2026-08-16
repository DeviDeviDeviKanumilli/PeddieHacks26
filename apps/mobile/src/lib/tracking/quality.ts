import type { FeedbackCode } from '@peddie/contracts';
import { MoveState } from '@/lib/tracking/analyzer';
import type { TrackingRecipe } from '@/lib/tracking/recipes';

export type PoseSample = {
  timestampMs: number;
  left: number | null;
  right: number | null;
  leftSecondary: number | null;
  rightSecondary: number | null;
  confidence: number;
};

export type RepQuality = {
  accuracyScore: number;
  controlScore: number;
  stabilityScore: number;
  formScore: number;
  feedbackCodes: FeedbackCode[];
};

const clampScore = (value: number): number => Math.round(Math.min(100, Math.max(0, value)));

const visibleValues = (samples: readonly PoseSample[], side: 'left' | 'right'): number[] =>
  samples
    .map((sample) => sample[side])
    .filter((value): value is number => value !== null && Number.isFinite(value));

const range = (values: readonly number[]): number =>
  values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);

const workingSide = (samples: readonly PoseSample[]): 'left' | 'right' =>
  range(visibleValues(samples, 'left')) >= range(visibleValues(samples, 'right'))
    ? 'left'
    : 'right';

const controlScore = (samples: readonly PoseSample[], side: 'left' | 'right'): number => {
  const observations = samples
    .map((sample) => ({ angle: sample[side], timestampMs: sample.timestampMs }))
    .filter((sample): sample is { angle: number; timestampMs: number } => sample.angle !== null);
  if (observations.length < 4) return 70;
  const velocities: number[] = [];
  for (let index = 1; index < observations.length; index += 1) {
    const previous = observations[index - 1];
    const current = observations[index];
    if (previous === undefined || current === undefined) continue;
    const elapsedSeconds = (current.timestampMs - previous.timestampMs) / 1000;
    if (elapsedSeconds < 0.015 || elapsedSeconds > 0.5) continue;
    velocities.push((current.angle - previous.angle) / elapsedSeconds);
  }
  if (velocities.length < 3) return 70;
  const accelerations = velocities.slice(1).map((velocity, index) => {
    const previous = velocities[index] ?? velocity;
    return Math.abs(velocity - previous);
  });
  const meanAcceleration =
    accelerations.reduce((sum, value) => sum + value, 0) / accelerations.length;
  const peakSpeed = Math.max(...velocities.map(Math.abs));
  return clampScore(
    100 - Math.max(0, meanAcceleration - 80) * 0.08 - Math.max(0, peakSpeed - 260) * 0.08,
  );
};

const sideStability = (
  samples: readonly PoseSample[],
  side: 'left' | 'right',
  recipe: TrackingRecipe,
): number | null => {
  const key = side === 'left' ? 'leftSecondary' : 'rightSecondary';
  const values = samples
    .map((sample) => sample[key])
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (values.length === 0) return null;
  const inRange = values.filter(
    (value) => value >= recipe.formAngleRange.min && value <= recipe.formAngleRange.max,
  ).length;
  return clampScore((inRange / values.length) * 100);
};

export const analyzeRepQuality = (
  recipe: TrackingRecipe,
  samples: readonly PoseSample[],
  durationMs: number,
  observedRangeOfMotionDeg: number | null,
): RepQuality => {
  const side = workingSide(samples);
  const observedRange = observedRangeOfMotionDeg ?? range(visibleValues(samples, side));
  const accuracyScore = clampScore((observedRange / recipe.targetRangeOfMotionDeg.min) * 100);
  const movementControl = controlScore(samples, side);
  const leftStability = sideStability(samples, 'left', recipe);
  const rightStability = sideStability(samples, 'right', recipe);
  const stabilityValues = [leftStability, rightStability].filter(
    (value): value is number => value !== null,
  );
  const stabilityScore =
    stabilityValues.length === 0
      ? 70
      : clampScore(stabilityValues.reduce((sum, value) => sum + value, 0) / stabilityValues.length);
  const formScore = clampScore(accuracyScore * 0.4 + movementControl * 0.3 + stabilityScore * 0.3);
  const meanConfidence =
    samples.length === 0
      ? 0
      : samples.reduce((sum, sample) => sum + sample.confidence, 0) / samples.length;
  const feedbackCodes: FeedbackCode[] = [];
  if (meanConfidence < 0.6) feedbackCodes.push('low_tracking_confidence');
  if (durationMs > recipe.targetTempoMs.max) feedbackCodes.push('tempo_too_slow');
  if (accuracyScore < 75) feedbackCodes.push('range_of_motion_short');
  if (accuracyScore < 60) feedbackCodes.push('target_position_missed');
  if (movementControl < 65) feedbackCodes.push('movement_jerky');
  if (leftStability !== null && leftStability < 65) feedbackCodes.push('stability_left');
  if (rightStability !== null && rightStability < 65) feedbackCodes.push('stability_right');
  return { accuracyScore, controlScore: movementControl, stabilityScore, formScore, feedbackCodes };
};

export const livePoseCue = (
  recipe: TrackingRecipe,
  sample: PoseSample,
  moveState: MoveState,
  ready: boolean,
): string => {
  if (sample.confidence < 0.45 || (sample.left === null && sample.right === null)) {
    return 'Move back until your working joints are visible';
  }
  const secondary = [sample.leftSecondary, sample.rightSecondary].filter(
    (value): value is number => value !== null,
  );
  if (
    secondary.length > 0 &&
    secondary.some(
      (value) => value < recipe.formAngleRange.min || value > recipe.formAngleRange.max,
    )
  ) {
    return recipe.formCue;
  }
  if (!ready) return recipe.startCue;
  return moveState === MoveState.TARGET_REACHED
    ? (recipe.returnCue ?? 'Target reached—return with control')
    : (recipe.movementCue ?? 'Move through a comfortable full range');
};
