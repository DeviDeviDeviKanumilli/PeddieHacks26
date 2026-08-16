import { equipmentEligible, POSITION_BITS, packPosition } from './bitmasks.js';
import type { CatalogExercise, CompatibilityResult, MovementProfile } from './types.js';

export const evaluateCompatibility = (
  exercise: CatalogExercise,
  profile: MovementProfile,
): CompatibilityResult => {
  if (profile.standing === 'avoid' && packPosition(exercise.position) === POSITION_BITS.standing) {
    return { status: 'incompatible', reasonCode: 'standing_avoided' };
  }
  if (exercise.impact === 'jump') {
    return { status: 'incompatible', reasonCode: 'impact_excluded' };
  }
  if (!equipmentEligible(exercise, profile)) {
    return { status: 'incompatible', reasonCode: 'equipment_missing' };
  }
  const region = profile.regions[exercise.primaryRegion] ?? 'neutral';
  if (region === 'avoid') {
    return { status: 'incompatible', reasonCode: 'region_avoided' };
  }
  if (region === 'limited') {
    return { status: 'caution', reasonCode: 'region_limited' };
  }
  return { status: 'compatible', reasonCode: 'eligible' };
};
