import { MoveState } from '@/lib/tracking/analyzer';
import { analyzeRepQuality, livePoseCue, type PoseSample } from '@/lib/tracking/quality';
import { getTrackingRecipe } from '@/lib/tracking/recipes';

const recipe = getTrackingRecipe('seated-biceps-curl');

const sample = (
  timestampMs: number,
  angle: number,
  secondary = 165,
  confidence = 0.9,
): PoseSample => ({
  timestampMs,
  left: angle,
  right: null,
  leftSecondary: secondary,
  rightSecondary: null,
  confidence,
});

describe('tracked rep quality', () => {
  it('produces allowlisted scores from a smooth full curl', () => {
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;
    const samples = [
      sample(0, 150),
      sample(250, 125),
      sample(500, 90),
      sample(750, 50),
      sample(1000, 85),
      sample(1250, 120),
      sample(1500, 150),
    ];
    const quality = analyzeRepQuality(recipe, samples, 1500, 100);
    expect(quality.accuracyScore).toBe(100);
    expect(quality.stabilityScore).toBe(100);
    expect(quality.formScore).toBeGreaterThanOrEqual(70);
    expect(quality.feedbackCodes).not.toContain('range_of_motion_short');
  });

  it('turns low visibility and posture drift into actionable cues', () => {
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;
    expect(livePoseCue(recipe, sample(0, 100, 165, 0.2), MoveState.START, false)).toMatch(
      /visible/iu,
    );
    expect(livePoseCue(recipe, sample(0, 100, 90), MoveState.START, false)).toBe(recipe.formCue);
    expect(livePoseCue(recipe, sample(0, 160), MoveState.START, false)).toBe(recipe.startCue);
  });

  it('gives exercise-specific knee-extension movement and control cues', () => {
    const kneeRecipe = getTrackingRecipe('seated-knee-extension');
    expect(kneeRecipe).toBeDefined();
    if (kneeRecipe === undefined) return;

    const kneeSample = (angle: number, secondary: number): PoseSample => ({
      timestampMs: 0,
      left: angle,
      right: null,
      leftSecondary: secondary,
      rightSecondary: null,
      confidence: 0.9,
    });
    expect(livePoseCue(kneeRecipe, kneeSample(130, 145), MoveState.START, true)).toBe(
      kneeRecipe.formCue,
    );
    expect(livePoseCue(kneeRecipe, kneeSample(130, 90), MoveState.START, true)).toBe(
      kneeRecipe.movementCue,
    );
    expect(livePoseCue(kneeRecipe, kneeSample(160, 90), MoveState.TARGET_REACHED, true)).toBe(
      kneeRecipe.returnCue,
    );
  });
});
