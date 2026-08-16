import {
  compactSearchParams,
  currentWorkoutItem,
  nextWorkoutItem,
  parseNonNegativeInt,
} from '@/lib/sessionFlow';
import type { Workout } from '@/types';

const workout: Workout = {
  id: 'guest-workout-1',
  title: 'Your focused movement',
  durationMinutes: 8,
  focus: 'Strength',
  items: [
    {
      id: 'item-1',
      exerciseSlug: 'seated-biceps-curl',
      sets: 2,
      reps: 10,
      restSeconds: 45,
    },
    {
      id: 'item-2',
      exerciseSlug: 'seated-ankle-pump',
      sets: 2,
      reps: 12,
      restSeconds: 30,
    },
  ],
};

describe('sessionFlow', () => {
  it('parses item indexes without dropping later exercises', () => {
    expect(parseNonNegativeInt(undefined)).toBe(0);
    expect(parseNonNegativeInt('1')).toBe(1);
    expect(parseNonNegativeInt('-4', 0)).toBe(0);
  });

  it('advances to the next planned workout item', () => {
    expect(currentWorkoutItem(workout, 0)?.exerciseSlug).toBe('seated-biceps-curl');
    expect(nextWorkoutItem(workout, 0)).toEqual({
      item: workout.items[1],
      index: 1,
    });
    expect(nextWorkoutItem(workout, 1)).toBeUndefined();
  });

  it('omits empty session query values so later screens keep a clean route', () => {
    expect(
      compactSearchParams({
        workout: 'guest-workout-1',
        exercise: 'seated-ankle-pump',
        itemIndex: '1',
        workoutSessionId: undefined,
        leftover: '',
      }),
    ).toBe('workout=guest-workout-1&exercise=seated-ankle-pump&itemIndex=1');
  });
});
