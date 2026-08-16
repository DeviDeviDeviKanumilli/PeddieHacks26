// generation contract tests against the curated 24. if seed sql drifts, these will lie.
import { describe, expect, it } from 'vitest';
import { CURATED_EXERCISES, generateWorkout, rankExercises } from './index.js';
import type { MovementProfile } from './types.js';

const profile: MovementProfile = {
  version: 1,
  bodyRegions: { shoulders: 'focus' },
  capabilities: {
    // mark everything available so unknown-capability conflicts do not steal the ranking story.
    seated_posture: 'available',
    standing: 'available',
    standing_balance: 'available',
    floor_transfer: 'available',
    supine: 'available',
    prone: 'available',
    overhead_reach: 'available',
    torso_rotation: 'available',
    left_grip: 'available',
    right_grip: 'available',
    left_upper_body_weight_bearing: 'available',
    right_upper_body_weight_bearing: 'available',
    left_lower_body_weight_bearing: 'available',
    right_lower_body_weight_bearing: 'available',
  },
  equipmentIds: ['dumbbells', 'resistance_band', 'stable-chair', 'wall'],
  goalIds: ['upper_body', 'strength'],
  intensityPreference: 'standard',
};

describe('workout generation', () => {
  // these numbers are the product contract. if they drift, update docs in the same change.
  it('ranks focus regions and keeps incompatible exercises out of generation', () => {
    const ranked = rankExercises({
      profile,
      candidates: CURATED_EXERCISES,
      primaryRegionIds: ['shoulders'],
    });

    expect(ranked[0]?.exercise.primaryRegionIds).toContain('shoulders');
    const conflicted = rankExercises({
      profile: { ...profile, bodyRegions: { shoulders: 'avoid' } },
      candidates: CURATED_EXERCISES,
      primaryRegionIds: ['shoulders'],
    });
    expect(conflicted.some((item) => item.compatibility.status === 'incompatible')).toBe(true);
    // rank still returns them. generation is the one that refuses to pick them.
  });

  it('generates the documented exercise count and duration band', () => {
    const workout = generateWorkout({
      profile,
      candidates: CURATED_EXERCISES,
      durationMinutes: 10,
      primaryRegionIds: ['shoulders'],
    });

    expect(workout.engineVersion).toBe('generation-v1');
    expect(workout.items).toHaveLength(3); // 10 minutes is the 3-exercise bucket.
    expect(workout.totalEstimatedSeconds).toBeGreaterThanOrEqual(10 * 60 * 0.85);
    expect(workout.totalEstimatedSeconds).toBeLessThanOrEqual(10 * 60 * 1.1); // 85-110% band, not exact minutes.
    expect(workout.items.every((item) => item.compatibility.status === 'compatible')).toBe(true);
  });

  it('fails safely instead of filling with incompatible exercises', () => {
    // empty capabilities + avoided regions should throw, not invent a plan.
    expect(() =>
      generateWorkout({
        profile: {
          ...profile,
          bodyRegions: { shoulders: 'avoid', upper_arms: 'avoid', hips: 'avoid', knees: 'avoid' },
          capabilities: {},
          equipmentIds: [],
        },
        candidates: CURATED_EXERCISES,
        durationMinutes: 5, // smallest legal duration still asks for 3 exercises.
      }),
    ).toThrow('not enough compatible exercises');
  });
});
