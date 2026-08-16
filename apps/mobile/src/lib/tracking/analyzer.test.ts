import {
  analyzeExercise,
  ExercisePhase,
  ExerciseSetTracker,
  MoveState,
  RangeOfMotionTracker,
  RepCounter,
} from '@/lib/tracking/analyzer';
import { createSetTracker, getCalibratedRecipe, getTrackingRecipe } from '@/lib/tracking/recipes';

// on-device analyzer. angles in, derived stats out.

describe('RangeOfMotionTracker', () => {
  it('calculates mean min max and range', () => {
    const tracker = new RangeOfMotionTracker();
    for (const angle of [120, 60, 90]) tracker.addAngle(angle);
    const stats = tracker.getStats();
    expect(stats).toEqual({
      sampleCount: 3,
      meanAngleDegrees: 90,
      minAngleDegrees: 60,
      maxAngleDegrees: 120,
      rangeOfMotionDegrees: 60,
    });
  });

  it('ignores missing detection', () => {
    // dropped frames are common; don't poison min/max.
    const tracker = new RangeOfMotionTracker();
    tracker.addAngle(null);
    tracker.addAngle(45);
    tracker.addAngle(null);
    expect(tracker.getStats()?.sampleCount).toBe(1);
    expect(tracker.getStats()?.meanAngleDegrees).toBe(45);
  });

  it('rejects invalid angles', () => {
    const tracker = new RangeOfMotionTracker();
    for (const angle of [-0.1, 180.1, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(() => tracker.addAngle(angle)).toThrow(/between 0 and 180/);
    }
  });
});

describe('RepCounter', () => {
  const makeCurl = () => new RepCounter([11, 13, 15], 40, 160);

  it('counts a decreasing then increasing elbow rep', () => {
    // peak first, count on the return so holds don't double-count.
    const counter = makeCurl();
    expect(counter.update(180)).toBe(false);
    expect(counter.update(40)).toBe(false);
    expect(counter.state).toBe(MoveState.TARGET_REACHED);
    expect(counter.update(160)).toBe(false);
    expect(counter.update(160.1)).toBe(true);
    expect(counter.repCount).toBe(1);
    expect(counter.state).toBe(MoveState.START);
  });

  it('counts an increasing then decreasing angle rep', () => {
    const counter = new RepCounter([23, 25, 27], 160, 40);
    expect(counter.update(160)).toBe(false);
    expect(counter.state).toBe(MoveState.TARGET_REACHED);
    expect(counter.update(40)).toBe(false);
    expect(counter.update(39.9)).toBe(true);
    expect(counter.repCount).toBe(1);
  });

  it('does not double-count while at start', () => {
    const counter = makeCurl();
    for (const angle of [40, 170, 175, 180]) counter.update(angle);
    expect(counter.repCount).toBe(1);
    expect(counter.state).toBe(MoveState.START);
  });

  it('ignores missing detections', () => {
    const counter = makeCurl();
    counter.update(40);
    expect(counter.update(null)).toBe(false);
    expect(counter.state).toBe(MoveState.TARGET_REACHED);
  });
});

describe('ExerciseSetTracker', () => {
  const makeTracker = (repsPerSet = 1, totalSets = 2, restSeconds = 5) =>
    new ExerciseSetTracker(
      {
        left: new RepCounter([11, 13, 15], 40, 160),
        right: new RepCounter([12, 14, 16], 40, 160),
      },
      totalSets,
      repsPerSet,
      restSeconds,
    );

  it('requires both limbs to complete a rep', () => {
    // lagging side is the official count. one arm finishing is not a rep.
    const tracker = makeTracker(2);
    tracker.update({ left: 40, right: 40 }, 0);
    expect(tracker.moveState).toBe(MoveState.TARGET_REACHED);
    expect(tracker.update({ left: 170, right: 100 }, 0.1)).toBe(false);
    expect(tracker.repsInSet).toBe(0);
    expect(tracker.update({ left: 170, right: 170 }, 0.2)).toBe(true);
    expect(tracker.repsInSet).toBe(1);
  });

  it('rests then starts the next set', () => {
    const tracker = makeTracker(1, 2, 1.5);
    tracker.update({ left: 40, right: 40 }, 0);
    tracker.update({ left: 170, right: 170 }, 0.1);
    expect(tracker.phase).toBe(ExercisePhase.RESTING);
    tracker.update({}, 1.59);
    expect(tracker.phase).toBe(ExercisePhase.RESTING);
    tracker.update({}, 1.6);
    expect(tracker.phase).toBe(ExercisePhase.ACTIVE);
    expect(tracker.currentSet).toBe(2);
    expect(tracker.repsInSet).toBe(0);
  });

  it('analyzes a partial session', () => {
    const tracker = makeTracker(2, 2, 1);
    tracker.update({ left: 40, right: 40 }, 0);
    tracker.update({ left: 170, right: 170 }, 0.1);
    const motion = { left: new RangeOfMotionTracker(), right: new RangeOfMotionTracker() };
    for (const angle of [120, 60, 90]) motion.left.addAngle(angle);
    const stats = analyzeExercise('seated-biceps-curl', 12.5, tracker, motion);
    expect(stats.phase).toBe(ExercisePhase.ACTIVE);
    expect(stats.setsCompleted).toBe(0);
    expect(stats.repsCompleted).toBe(1);
    expect(stats.motionStats.left?.rangeOfMotionDegrees).toBe(60);
    expect(stats.motionStats.right).toBeNull();
  });
});

describe('tracking recipes', () => {
  it('marks seated biceps curl as the calibrated Android-first recipe', () => {
    // other recipes exist as placeholders; don't treat them as accepted.
    expect(getCalibratedRecipe('seated-biceps-curl')?.key).toBe('seated-biceps-curl-v1');
    expect(getCalibratedRecipe('wall-push-up')).toBeUndefined();
    expect(getTrackingRecipe('wall-push-up')?.calibrated).toBe(false);
  });

  it('builds a one-set tracker for the active session screen', () => {
    // rest lives in the rest route, so the tracker uses 0 rest seconds.
    const recipe = getCalibratedRecipe('seated-biceps-curl');
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;
    const tracker = createSetTracker(recipe, 8);
    expect(tracker.totalSets).toBe(1);
    expect(tracker.repsPerSet).toBe(8);
  });
});
