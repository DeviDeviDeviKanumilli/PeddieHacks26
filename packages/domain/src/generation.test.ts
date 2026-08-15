import { describe, expect, it } from 'vitest';
import { CURATED_EXERCISES, generateWorkout, rankExercises } from './index.js';
import type { MovementProfile } from './types.js';

const profile: MovementProfile = {
  version: 1,
  bodyRegions: { shoulders: 'focus' },
  capabilities: {
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
  });

  it('generates the documented exercise count and duration band', () => {
    const workout = generateWorkout({
      profile,
      candidates: CURATED_EXERCISES,
      durationMinutes: 10,
      primaryRegionIds: ['shoulders'],
    });

    expect(workout.engineVersion).toBe('generation-v1');
    expect(workout.items).toHaveLength(3);
    expect(workout.totalEstimatedSeconds).toBeGreaterThanOrEqual(10 * 60 * 0.85);
    expect(workout.totalEstimatedSeconds).toBeLessThanOrEqual(10 * 60 * 1.1);
    expect(workout.items.every((item) => item.compatibility.status === 'compatible')).toBe(true);
  });

  it('fails safely instead of filling with incompatible exercises', () => {
    expect(() =>
      generateWorkout({
        profile: {
          ...profile,
          bodyRegions: { shoulders: 'avoid', upper_arms: 'avoid', hips: 'avoid', knees: 'avoid' },
          capabilities: {},
          equipmentIds: [],
        },
        candidates: CURATED_EXERCISES,
        durationMinutes: 5,
      }),
    ).toThrow('not enough compatible exercises');
  });
});
