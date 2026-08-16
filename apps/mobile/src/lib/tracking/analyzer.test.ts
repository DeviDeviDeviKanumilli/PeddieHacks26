import {
  analyzeExercise,
  ExercisePhase,
  ExerciseSetTracker,
  MoveState,
  RangeOfMotionTracker,
  RepCounter,
} from '@/lib/tracking/analyzer';
import { createSetTracker, getCalibratedRecipe, getTrackingRecipe } from '@/lib/tracking/recipes';

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
  const runCurl = (counter: RepCounter): boolean => {
    const samples = [170, 170, 170, 130, 95, 40, 40, 40, 90, 125, 165, 165, 165];
    return samples.reduce(
      (completed, angle, index) => counter.update(angle, index * 0.12) || completed,
      false,
    );
  };

  it('counts a decreasing then increasing elbow rep', () => {
    const counter = makeCurl();
    expect(runCurl(counter)).toBe(true);
    expect(counter.repCount).toBe(1);
    expect(counter.state).toBe(MoveState.START);
  });

  it('counts an increasing then decreasing angle rep', () => {
    const counter = new RepCounter([23, 25, 27], 160, 40);
    const samples = [35, 35, 35, 75, 120, 165, 165, 165, 120, 75, 35, 35, 35];
    const completed = samples.reduce(
      (result, angle, index) => counter.update(angle, index * 0.12) || result,
      false,
    );
    expect(completed).toBe(true);
    expect(counter.repCount).toBe(1);
  });

  it('does not count a stationary arm or a single noisy angle', () => {
    const counter = makeCurl();
    for (const angle of [170, 170, 170, 168, 42, 169, 171, 168, 170]) {
      counter.update(angle);
    }
    expect(counter.repCount).toBe(0);
    expect(counter.state).toBe(MoveState.START);
  });

  it('requires a confirmed start position before accepting motion', () => {
    const counter = makeCurl();
    expect(counter.isArmed).toBe(false);
    counter.update(170);
    counter.update(170);
    expect(counter.isArmed).toBe(false);
    counter.update(170);
    expect(counter.isArmed).toBe(true);
  });

  it('ignores missing detections', () => {
    const counter = makeCurl();
    for (const angle of [170, 170, 170, 120, 90, 40, 40, 40]) counter.update(angle);
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
  const runTrackerCurl = (
    tracker: ExerciseSetTracker,
    leftVisible = true,
    rightVisible = true,
  ): number => {
    const samples = [170, 170, 170, 130, 95, 40, 40, 40, 90, 125, 165, 165, 165];
    let completedAt = 0;
    for (const [index, angle] of samples.entries()) {
      completedAt = index * 0.12;
      tracker.update(
        { left: leftVisible ? angle : null, right: rightVisible ? angle : null },
        completedAt,
      );
    }
    return completedAt;
  };

  it('requires both limbs to complete a rep', () => {
    const tracker = makeTracker(2);
    runTrackerCurl(tracker);
    expect(tracker.repsInSet).toBe(1);
  });

  it('can count either visible limb for unilateral-friendly recipes', () => {
    const tracker = new ExerciseSetTracker(
      {
        left: new RepCounter([11, 13, 15], 50, 145),
        right: new RepCounter([12, 14, 16], 50, 145),
      },
      1,
      2,
      0,
      'either',
    );
    runTrackerCurl(tracker, true, false);
    expect(tracker.repsInSet).toBe(1);
  });

  it('rests then starts the next set', () => {
    const tracker = makeTracker(1, 2, 1.5);
    const completedAt = runTrackerCurl(tracker);
    expect(tracker.phase).toBe(ExercisePhase.RESTING);
    tracker.update({}, completedAt + 1.49);
    expect(tracker.phase).toBe(ExercisePhase.RESTING);
    tracker.update({}, completedAt + 1.5);
    expect(tracker.phase).toBe(ExercisePhase.ACTIVE);
    expect(tracker.currentSet).toBe(2);
    expect(tracker.repsInSet).toBe(0);
  });

  it('analyzes a partial session', () => {
    const tracker = makeTracker(2, 2, 1);
    runTrackerCurl(tracker);
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
  it('enables the Android-first automatic-counting recipes', () => {
    expect(getCalibratedRecipe('seated-biceps-curl')?.key).toBe('seated-biceps-curl-v1');
    expect(getCalibratedRecipe('wall-push-up')?.key).toBe('wall-push-up-v1');
    expect(getCalibratedRecipe('seated-knee-extension')?.key).toBe('seated-knee-extension-v1');
    expect(getTrackingRecipe('seated-march')?.limbRule).toBe('either');
  });

  it('counts a full seated knee extension but rejects stationary and partial motion', () => {
    const recipe = getCalibratedRecipe('seated-knee-extension');
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;

    const stationaryTracker = createSetTracker(recipe, 3);
    for (const [index, angle] of [98, 99, 98, 100, 98, 99, 98].entries()) {
      stationaryTracker.update({ left: angle, right: null }, index * 0.12);
    }
    expect(stationaryTracker.repsInSet).toBe(0);

    const partialTracker = createSetTracker(recipe, 3);
    for (const [index, angle] of [100, 100, 100, 120, 140, 140, 120, 100, 100, 100].entries()) {
      partialTracker.update({ left: angle, right: null }, index * 0.12);
    }
    expect(partialTracker.repsInSet).toBe(0);

    const tracker = createSetTracker(recipe, 3);
    const rep = [100, 100, 100, 120, 140, 160, 160, 160, 140, 120, 100, 100, 100];
    for (const [index, angle] of rep.entries()) {
      tracker.update({ left: angle, right: null }, index * 0.12);
    }
    expect(tracker.repsInSet).toBe(1);
  });

  it('counts a confirmed wall push-up but rejects stationary noise', () => {
    const recipe = getCalibratedRecipe('wall-push-up');
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;

    const noisyTracker = createSetTracker(recipe, 3);
    for (const [index, angle] of [160, 160, 160, 92, 160, 158, 161].entries()) {
      noisyTracker.update({ left: angle, right: null }, index * 0.12);
    }
    expect(noisyTracker.repsInSet).toBe(0);

    const tracker = createSetTracker(recipe, 3);
    const rep = [160, 160, 160, 135, 115, 90, 90, 90, 112, 132, 155, 155, 155];
    for (const [index, angle] of rep.entries()) {
      tracker.update({ left: angle, right: null }, index * 0.12);
    }
    expect(tracker.repsInSet).toBe(1);
  });

  it('builds a one-set tracker for the active session screen', () => {
    const recipe = getCalibratedRecipe('seated-biceps-curl');
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;
    const tracker = createSetTracker(recipe, 8);
    expect(tracker.totalSets).toBe(1);
    expect(tracker.repsPerSet).toBe(8);
  });
});
