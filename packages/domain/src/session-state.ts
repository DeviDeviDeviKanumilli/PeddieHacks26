// allowed session hops. terminal states have empty lists on purpose.
// two machines, same error type. skipped exists only on exercises.
export type WorkoutSessionState = 'active' | 'paused' | 'resting' | 'completed' | 'cancelled';
export type ExerciseSessionState =
  | 'pending'
  | 'active'
  | 'paused'
  | 'resting'
  | 'completed'
  | 'cancelled'
  | 'skipped'; // pending/skipped are exercise-only. a workout starts already active.

export class InvalidStateTransitionError extends Error {
  readonly code = 'invalidStateTransition';
  readonly currentState: string;
  readonly nextState: string;
  // same class for workout and exercise. the api maps this to 409.

  constructor(currentState: string, nextState: string) {
    super(`Cannot transition from ${currentState} to ${nextState}.`);
    this.name = 'InvalidStateTransitionError';
    this.currentState = currentState;
    this.nextState = nextState;
  }
}

const workoutTransitions: Readonly<Record<WorkoutSessionState, readonly WorkoutSessionState[]>> = {
  active: ['paused', 'resting', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'], // no pause -> rest. they have to resume first.
  resting: ['active', 'completed', 'cancelled'], // rest is not a pause. resume goes back to active.
  completed: [],
  cancelled: [],
};

const exerciseTransitions: Readonly<Record<ExerciseSessionState, readonly ExerciseSessionState[]>> =
  {
    pending: ['active', 'skipped'], // cannot complete a set they never started
    active: ['paused', 'resting', 'completed', 'cancelled'],
    paused: ['active', 'completed', 'cancelled'],
    resting: ['active', 'completed', 'cancelled'],
    completed: [],
    cancelled: [],
    skipped: [], // skip is terminal. they cannot un-skip without a new exercise row.
  };

export const canTransitionWorkoutSession = (
  currentState: WorkoutSessionState,
  nextState: WorkoutSessionState,
): boolean => workoutTransitions[currentState].includes(nextState);
// use the can-transition helpers for ui enablement. the transition helpers throw for the write path.

export const transitionWorkoutSession = (
  currentState: WorkoutSessionState,
  nextState: WorkoutSessionState,
): WorkoutSessionState => {
  if (!canTransitionWorkoutSession(currentState, nextState)) {
    throw new InvalidStateTransitionError(currentState, nextState); // let the route map this to 409
  }
  return nextState;
};

export const canTransitionExerciseSession = (
  currentState: ExerciseSessionState,
  nextState: ExerciseSessionState,
): boolean => exerciseTransitions[currentState].includes(nextState);

export const transitionExerciseSession = (
  currentState: ExerciseSessionState,
  nextState: ExerciseSessionState,
): ExerciseSessionState => {
  if (!canTransitionExerciseSession(currentState, nextState)) {
    throw new InvalidStateTransitionError(currentState, nextState);
    // same throw for both machines. do not invent a second error type.
  }
  return nextState;
};
