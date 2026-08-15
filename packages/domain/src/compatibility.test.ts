import { describe, expect, it } from 'vitest';
import { CURATED_EXERCISES, evaluateCompatibility } from './index.js';
import type { MovementProfile } from './types.js';

const allCapabilities = [
  'seated_posture',
  'standing',
  'standing_balance',
  'floor_transfer',
  'supine',
  'prone',
  'overhead_reach',
  'torso_rotation',
  'left_grip',
  'right_grip',
  'left_upper_body_weight_bearing',
  'right_upper_body_weight_bearing',
  'left_lower_body_weight_bearing',
  'right_lower_body_weight_bearing',
  'left_single_leg_balance',
  'right_single_leg_balance',
];

const profile = (overrides: Partial<MovementProfile> = {}): MovementProfile => ({
  version: 1,
  bodyRegions: {},
  capabilities: Object.fromEntries(allCapabilities.map((capability) => [capability, 'available'])),
  equipmentIds: ['dumbbells', 'resistance_band', 'stable-chair', 'wall'],
  goalIds: ['upper_body', 'lower_body', 'strength'],
  intensityPreference: 'standard',
  ...overrides,
});

const firstExercise = CURATED_EXERCISES.at(0);
if (firstExercise === undefined) {
  throw new Error('The curated catalog must contain at least one exercise.');
}

describe('exercise compatibility', () => {
  it('accepts an available exercise and its OR equipment group', () => {
    const result = evaluateCompatibility(
      firstExercise,
      profile({ equipmentIds: ['resistance_band'] }),
    );

    expect(result.status).toBe('compatible');
    expect(result.engineVersion).toBe('compatibility-v1');
  });

  it('hard-fails when a primary region is avoided', () => {
    const result = evaluateCompatibility(
      firstExercise,
      profile({ bodyRegions: { upper_arms: 'avoid' } }),
    );

    expect(result.status).toBe('incompatible');
    expect(result.reasons.map((item) => item.code)).toContain('avoided_body_region');
  });

  it('returns caution for a limited moderate-demand region', () => {
    const result = evaluateCompatibility(
      firstExercise,
      profile({ bodyRegions: { upper_arms: 'limited' } }),
    );

    expect(result.status).toBe('caution');
    expect(result.reasons.map((item) => item.code)).toContain('limited_body_region');
  });

  it('requires explicit confirmation for required capabilities', () => {
    const result = evaluateCompatibility(
      firstExercise,
      profile({ capabilities: { seated_posture: 'available' } }),
    );

    expect(result.status).toBe('incompatible');
    expect(result.reasons.map((item) => item.code)).toContain('unknown_required_capability');
  });
});
