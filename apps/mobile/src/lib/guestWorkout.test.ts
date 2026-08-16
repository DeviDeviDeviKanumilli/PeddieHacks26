import { exercises } from '@/data/catalog';
import { buildGuestWorkout, planFitReasons } from '@/lib/guestWorkout';
import type { MovementProfile } from '@/types';

// guest adapter: local ranking, no live generate-v1.

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
  // avoid is a hard filter, not a score penalty.
  it('removes knee-loading and standing exercises when those movements are avoided', () => {
    const workout = buildGuestWorkout(
      profile({ regions: { 'left-knee': 'avoid' }, capabilities: { standing: 'avoid' } }),
      exercises,
    );

    expect(workout.items.map(({ exerciseSlug }) => exerciseSlug)).not.toEqual(
      expect.arrayContaining(['sit-to-stand', 'wall-push-up', 'seated-knee-extension']),
    );
  });

  it('does not recommend band or wall work when the user only selected none', () => {
    // bands/walls are extra kit. chair still counts as everyday furniture.
    const workout = buildGuestWorkout(profile({ equipment: ['None'] }), exercises);
    const slugs = workout.items.map(({ exerciseSlug }) => exerciseSlug);

    expect(slugs).not.toEqual(
      expect.arrayContaining(['seated-resistance-band-row', 'wall-push-up']),
    );
  });

  it('still fills a four-exercise plan when only none is selected, using a chair as everyday furniture', () => {
    // 'none' must not empty the guest plan.
    const workout = buildGuestWorkout(profile({ equipment: ['None'] }), exercises);
    const slugs = workout.items.map(({ exerciseSlug }) => exerciseSlug);

    expect(slugs).toHaveLength(4);
    expect(slugs).toEqual(expect.arrayContaining(['seated-biceps-curl', 'seated-knee-extension']));
  });
});

describe('planFitReasons', () => {
  // copy for the guest summary card, capped at three reasons.
  it('explains seated, no-jumping, and saved knee limits', () => {
    const workout = buildGuestWorkout(
      profile({ regions: { 'left-knee': 'avoid' }, capabilities: { standing: 'avoid' } }),
      exercises,
    );
    const planned = workout.items
      .map((item) => exercises.find((exercise) => exercise.slug === item.exerciseSlug))
      .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise));

    expect(planFitReasons(profile({ regions: { 'left-knee': 'avoid' } }), planned)).toEqual(
      expect.arrayContaining([
        'Seated movements',
        'No jumping',
        'Avoids your saved knee limitation',
      ]),
    );
  });
});
