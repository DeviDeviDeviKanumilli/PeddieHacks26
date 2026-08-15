import { describe, expect, it } from 'vitest';
import {
  InvalidStateTransitionError,
  transitionExerciseSession,
  transitionWorkoutSession,
} from './index.js';

describe('session state machines', () => {
  it('allows documented workout transitions', () => {
    expect(transitionWorkoutSession('active', 'paused')).toBe('paused');
    expect(transitionWorkoutSession('resting', 'completed')).toBe('completed');
  });

  it('allows pending exercise sessions to start or skip', () => {
    expect(transitionExerciseSession('pending', 'active')).toBe('active');
    expect(transitionExerciseSession('pending', 'skipped')).toBe('skipped');
  });

  it('rejects terminal and otherwise invalid transitions', () => {
    expect(() => transitionWorkoutSession('completed', 'active')).toThrow(
      InvalidStateTransitionError,
    );
    expect(() => transitionExerciseSession('pending', 'completed')).toThrow('Cannot transition');
  });
});
