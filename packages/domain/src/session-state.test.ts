// session hop tests. anything not listed here is what the api should 409.
import { describe, expect, it } from 'vitest';
import {
  InvalidStateTransitionError,
  transitionExerciseSession,
  transitionWorkoutSession,
} from './index.js';

describe('session state machines', () => {
  // these are the hops the api will allow. anything else should 409.
  it('allows documented workout transitions', () => {
    expect(transitionWorkoutSession('active', 'paused')).toBe('paused');
    expect(transitionWorkoutSession('resting', 'completed')).toBe('completed'); // rest can finish the workout; pause cannot skip to rest.
  });

  it('allows pending exercise sessions to start or skip', () => {
    expect(transitionExerciseSession('pending', 'active')).toBe('active');
    expect(transitionExerciseSession('pending', 'skipped')).toBe('skipped'); // skip without starting. complete is not allowed from pending.
  });

  it('rejects terminal and otherwise invalid transitions', () => {
    expect(() => transitionWorkoutSession('completed', 'active')).toThrow(
      InvalidStateTransitionError,
    ); // no resurrection from a terminal workout.
    expect(() => transitionExerciseSession('pending', 'completed')).toThrow('Cannot transition');
  });
});
