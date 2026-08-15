export type WorkoutSessionState = 'active' | 'paused' | 'resting' | 'completed' | 'cancelled';
export type ExerciseSessionState =
  | 'pending'
  | 'active'
  | 'paused'
  | 'resting'
  | 'completed'
  | 'cancelled'
  | 'skipped';

export class InvalidStateTransitionError extends Error {
  readonly code = 'invalidStateTransition';
  readonly currentState: string;
  readonly nextState: string;

  constructor(currentState: string, nextState: string) {
    super(`Cannot transition from ${currentState} to ${nextState}.`);
    this.name = 'InvalidStateTransitionError';
    this.currentState = currentState;
    this.nextState = nextState;
  }
}

const workoutTransitions: Readonly<Record<WorkoutSessionState, readonly WorkoutSessionState[]>> = {
  active: ['paused', 'resting', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'],
  resting: ['active', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const exerciseTransitions: Readonly<Record<ExerciseSessionState, readonly ExerciseSessionState[]>> =
  {
    pending: ['active', 'skipped'],
    active: ['paused', 'resting', 'completed', 'cancelled'],
    paused: ['active', 'completed', 'cancelled'],
    resting: ['active', 'completed', 'cancelled'],
    completed: [],
    cancelled: [],
    skipped: [],
  };

export const canTransitionWorkoutSession = (
  currentState: WorkoutSessionState,
  nextState: WorkoutSessionState,
): boolean => workoutTransitions[currentState].includes(nextState);

export const transitionWorkoutSession = (
  currentState: WorkoutSessionState,
  nextState: WorkoutSessionState,
): WorkoutSessionState => {
  if (!canTransitionWorkoutSession(currentState, nextState)) {
    throw new InvalidStateTransitionError(currentState, nextState);
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
  }
  return nextState;
};
