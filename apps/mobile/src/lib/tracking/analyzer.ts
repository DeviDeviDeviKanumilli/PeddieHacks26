// on-device port of the python analyzer. angles in, derived stats out — no landmarks stored.
export type RangeOfMotionStats = {
  sampleCount: number;
  meanAngleDegrees: number;
  minAngleDegrees: number;
  maxAngleDegrees: number;
  rangeOfMotionDegrees: number;
};

const isAngle = (value: number): boolean => Number.isFinite(value) && value >= 0 && value <= 180;

const isPositiveInt = (value: number): boolean => Number.isInteger(value) && value >= 1;

export class RangeOfMotionTracker {
  #sampleCount = 0;
  #meanAngle = 0;
  #minAngle: number | null = null;
  #maxAngle: number | null = null;

  reset(): void {
    this.#sampleCount = 0;
    this.#meanAngle = 0;
    this.#minAngle = null;
    this.#maxAngle = null;
  }

  addAngle(angleDegrees: number | null): boolean {
    // missing detection is common; skip instead of poisoning min/max.
    if (angleDegrees === null) return false;
    if (!isAngle(angleDegrees)) {
      throw new Error('angle_degrees must be between 0 and 180');
    }
    this.#sampleCount += 1;
    // running mean so we don't keep every sample in memory.
    this.#meanAngle += (angleDegrees - this.#meanAngle) / this.#sampleCount;
    this.#minAngle =
      this.#minAngle === null ? angleDegrees : Math.min(this.#minAngle, angleDegrees);
    this.#maxAngle =
      this.#maxAngle === null ? angleDegrees : Math.max(this.#maxAngle, angleDegrees);
    return true;
  }

  getStats(): RangeOfMotionStats | null {
    if (this.#minAngle === null || this.#maxAngle === null) return null;
    return {
      sampleCount: this.#sampleCount,
      meanAngleDegrees: this.#meanAngle,
      minAngleDegrees: this.#minAngle,
      maxAngleDegrees: this.#maxAngle,
      rangeOfMotionDegrees: this.#maxAngle - this.#minAngle,
    };
  }
}

export const MoveState = {
  START: 'START',
  TARGET_REACHED: 'TARGET_REACHED',
} as const;

export type MoveState = (typeof MoveState)[keyof typeof MoveState];

export class RepCounter {
  readonly landmarkIndices: readonly [number, number, number];
  readonly targetAngleDegrees: number;
  readonly returnAngleDegrees: number;
  // curl: target 40 is lower than return 160. extension recipes flip this.
  readonly #targetIsLower: boolean;
  #state: MoveState = MoveState.START;
  #repCount = 0;

  constructor(
    landmarkIndices: readonly [number, number, number],
    targetAngleDegrees: number,
    returnAngleDegrees: number,
  ) {
    if (
      landmarkIndices.length !== 3 ||
      landmarkIndices.some((index) => !Number.isInteger(index) || index < 0) ||
      new Set(landmarkIndices).size !== 3
    ) {
      throw new Error('landmark_indices must contain three distinct non-negative integers');
    }
    if (
      !isAngle(targetAngleDegrees) ||
      !isAngle(returnAngleDegrees) ||
      targetAngleDegrees === returnAngleDegrees
    ) {
      throw new Error('target and return angles must be different values between 0 and 180');
    }
    this.landmarkIndices = landmarkIndices;
    this.targetAngleDegrees = targetAngleDegrees;
    this.returnAngleDegrees = returnAngleDegrees;
    this.#targetIsLower = targetAngleDegrees < returnAngleDegrees;
  }

  reset(): void {
    this.#state = MoveState.START;
    this.#repCount = 0;
  }

  get state(): MoveState {
    return this.#state;
  }

  get repCount(): number {
    return this.#repCount;
  }

  update(angleDegrees: number | null): boolean {
    // hold state across dropped frames so a blink doesn't cancel a half-rep.
    if (angleDegrees === null) return false;
    if (!isAngle(angleDegrees)) {
      throw new Error('angle_degrees must be between 0 and 180');
    }
    const targetReached = this.#targetIsLower
      ? angleDegrees <= this.targetAngleDegrees
      : angleDegrees >= this.targetAngleDegrees;
    const returnedToStart = this.#targetIsLower
      ? angleDegrees > this.returnAngleDegrees
      : angleDegrees < this.returnAngleDegrees;

    if (this.#state === MoveState.START && targetReached) {
      // peak first; counting happens on the way back so we don't double-count holds.
      this.#state = MoveState.TARGET_REACHED;
      return false;
    }
    if (this.#state === MoveState.TARGET_REACHED && returnedToStart) {
      this.#state = MoveState.START;
      this.#repCount += 1;
      return true;
    }
    return false;
  }
}

export const ExercisePhase = {
  ACTIVE: 'ACTIVE',
  RESTING: 'RESTING',
  COMPLETE: 'COMPLETE',
} as const;

export type ExercisePhase = (typeof ExercisePhase)[keyof typeof ExercisePhase];

export class ExerciseSetTracker {
  readonly limbCounters: Record<string, RepCounter>;
  readonly totalSets: number;
  readonly repsPerSet: number;
  readonly restSeconds: number;
  #phase: ExercisePhase = ExercisePhase.ACTIVE;
  #currentSet = 1;
  #repsInSet = 0;
  #restEndsAtSeconds: number | null = null;
  #completedAtSeconds: number | null = null;

  constructor(
    limbCounters: Record<string, RepCounter>,
    totalSets: number,
    repsPerSet: number,
    restSeconds = 5,
  ) {
    const names = Object.keys(limbCounters);
    if (names.length === 0 || names.some((name) => name.trim().length === 0)) {
      throw new Error('limb_counters must contain at least one named limb');
    }
    if (Object.values(limbCounters).some((counter) => !(counter instanceof RepCounter))) {
      throw new Error('every limb counter must be a RepCounter');
    }
    if (!isPositiveInt(totalSets)) {
      throw new Error('total_sets must be a positive integer');
    }
    if (!isPositiveInt(repsPerSet)) {
      throw new Error('reps_per_set must be a positive integer');
    }
    if (!Number.isFinite(restSeconds) || restSeconds < 0) {
      throw new Error('rest_seconds must be a finite non-negative number');
    }
    this.limbCounters = { ...limbCounters };
    this.totalSets = totalSets;
    this.repsPerSet = repsPerSet;
    this.restSeconds = restSeconds;
  }

  reset(): void {
    this.#phase = ExercisePhase.ACTIVE;
    this.#currentSet = 1;
    this.#repsInSet = 0;
    this.#restEndsAtSeconds = null;
    this.#completedAtSeconds = null;
    for (const counter of Object.values(this.limbCounters)) counter.reset();
  }

  get phase(): ExercisePhase {
    return this.#phase;
  }

  get currentSet(): number {
    return this.#currentSet;
  }

  get repsInSet(): number {
    return this.#repsInSet;
  }

  get moveState(): MoveState {
    if (this.#phase !== ExercisePhase.ACTIVE) return MoveState.START;
    return Object.values(this.limbCounters).every(
      (counter) => counter.state === MoveState.TARGET_REACHED,
    )
      ? MoveState.TARGET_REACHED
      : MoveState.START;
  }

  get completedAtSeconds(): number | null {
    return this.#completedAtSeconds;
  }

  restRemainingSeconds(nowSeconds: number): number {
    if (this.#phase !== ExercisePhase.RESTING || this.#restEndsAtSeconds === null) return 0;
    return Math.max(0, this.#restEndsAtSeconds - nowSeconds);
  }

  update(jointAngles: Record<string, number | null>, nowSeconds: number): boolean {
    if (!Number.isFinite(nowSeconds)) {
      throw new Error('now_seconds must be finite');
    }
    const unknownLimbs = Object.keys(jointAngles).filter(
      (name) => this.limbCounters[name] === undefined,
    );
    if (unknownLimbs.length > 0) {
      throw new Error(`unknown limbs: ${unknownLimbs.sort().join(', ')}`);
    }
    if (this.#phase === ExercisePhase.COMPLETE) return false;
    if (this.#phase === ExercisePhase.RESTING) {
      // rest is a timer, not pose. don't count reps until it expires.
      if (this.#restEndsAtSeconds !== null && nowSeconds >= this.#restEndsAtSeconds) {
        this.#currentSet += 1;
        this.#repsInSet = 0;
        this.#restEndsAtSeconds = null;
        this.#phase = ExercisePhase.ACTIVE;
        for (const counter of Object.values(this.limbCounters)) counter.reset();
      }
      return false;
    }

    const previousReps = this.#repsInSet;
    for (const [limbName, counter] of Object.entries(this.limbCounters)) {
      counter.update(jointAngles[limbName] ?? null);
    }
    this.#repsInSet = Math.min(
      this.repsPerSet,
      // both limbs must finish; the lagging side is the official count.
      Math.min(...Object.values(this.limbCounters).map((counter) => counter.repCount)),
    );
    const repCompleted = this.#repsInSet > previousReps;
    if (this.#repsInSet === this.repsPerSet) {
      if (this.#currentSet === this.totalSets) {
        this.#phase = ExercisePhase.COMPLETE;
        this.#completedAtSeconds = nowSeconds;
      } else {
        this.#phase = ExercisePhase.RESTING;
        this.#restEndsAtSeconds = nowSeconds + this.restSeconds;
      }
    }
    return repCompleted;
  }
}

export type ExerciseStats = {
  exerciseName: string;
  exerciseTimeSeconds: number;
  phase: ExercisePhase;
  repsCompleted: number;
  setsCompleted: number;
  setsPlanned: number;
  repsPerSet: number;
  motionStats: Record<string, RangeOfMotionStats | null>;
};

const completedCounts = (tracker: ExerciseSetTracker): readonly [number, number] => {
  if (tracker.phase === ExercisePhase.COMPLETE) {
    return [tracker.totalSets, tracker.totalSets * tracker.repsPerSet];
  }
  if (tracker.phase === ExercisePhase.RESTING) {
    // current set still names the set we just finished.
    return [tracker.currentSet, tracker.currentSet * tracker.repsPerSet];
  }
  return [
    tracker.currentSet - 1,
    (tracker.currentSet - 1) * tracker.repsPerSet + tracker.repsInSet,
  ];
};

export const analyzeExercise = (
  exerciseName: string,
  exerciseTimeSeconds: number,
  exerciseTracker: ExerciseSetTracker,
  motionTrackers: Record<string, RangeOfMotionTracker>,
): ExerciseStats => {
  // snapshot for the complete screen. still derived stats, never a pose dump.
  if (exerciseName.trim().length === 0) {
    throw new Error('exercise_name must be a non-empty string');
  }
  if (!(exerciseTracker instanceof ExerciseSetTracker)) {
    throw new TypeError('exercise_tracker must be an ExerciseSetTracker');
  }
  if (!Number.isFinite(exerciseTimeSeconds) || exerciseTimeSeconds < 0) {
    throw new Error('exercise_time_seconds must be finite and non-negative');
  }
  if (
    Object.entries(motionTrackers).some(
      ([name, tracker]) => name.trim().length === 0 || !(tracker instanceof RangeOfMotionTracker),
    )
  ) {
    throw new Error('motion_trackers must map limb names to RangeOfMotionTracker values');
  }
  const [setsCompleted, repsCompleted] = completedCounts(exerciseTracker);
  return {
    exerciseName: exerciseName.trim(),
    exerciseTimeSeconds,
    phase: exerciseTracker.phase,
    repsCompleted,
    setsCompleted,
    setsPlanned: exerciseTracker.totalSets,
    repsPerSet: exerciseTracker.repsPerSet,
    motionStats: Object.fromEntries(
      Object.entries(motionTrackers).map(([name, tracker]) => [name, tracker.getStats()]),
    ),
  };
};
