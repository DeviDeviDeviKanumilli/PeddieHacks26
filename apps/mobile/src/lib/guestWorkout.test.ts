import { exercises } from '@/data/catalog';
import { buildGuestWorkout } from '@/lib/guestWorkout';
import type { MovementProfile } from '@/types';

const profile = (overrides: Partial<MovementProfile> = {}): MovementProfile => ({
  goals: ['Build strength'],
  regions: {},
  capabilities: {},
  equipment: ['Stable chair', 'Resistance band', 'Wall'],
  accessibility: [],
  onboardingComplete: true,
  ...overrides,
});

describe('buildGuestWorkout', () => {
  it('removes knee-loading and standing exercises when those movements are avoided', () => {
    const workout = buildGuestWorkout(
      profile({ regions: { 'left-knee': 'avoid' }, capabilities: { standing: 'avoid' } }),
      exercises,
    );

    expect(workout.items.map(({ exerciseSlug }) => exerciseSlug)).not.toEqual(
      expect.arrayContaining(['sit-to-stand', 'wall-push-up', 'seated-knee-extension']),
    );
  });

  it('does not recommend required equipment that the user did not select', () => {
    const workout = buildGuestWorkout(profile({ equipment: ['None'] }), exercises);

    expect(workout.items.map(({ exerciseSlug }) => exerciseSlug)).not.toEqual(
      expect.arrayContaining(['seated-resistance-band-row', 'sit-to-stand', 'wall-push-up']),
    );
  });
});
