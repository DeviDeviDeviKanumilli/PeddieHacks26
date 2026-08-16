import { equipmentEligible, POSITION_BITS, packPosition } from './bitmasks.js';
import type { CatalogExercise, CompatibilityResult, MovementProfile } from './types.js';

// first hard no wins. we do not score our way out of a conflict.
export const evaluateCompatibility = (
  exercise: CatalogExercise,
  profile: MovementProfile,
): CompatibilityResult => {
  // standing avoid only blocks standing. seated/floor/kneeling still go through.
  if (profile.standing === 'avoid' && packPosition(exercise.position) === POSITION_BITS.standing) {
    return { status: 'incompatible', reasonCode: 'standing_avoided' };
  }
  if (exercise.impact === 'jump') {
    // jumping is just out. no caution, no maybe.
    return { status: 'incompatible', reasonCode: 'impact_excluded' };
  }
  if (!equipmentEligible(exercise, profile)) {
    return { status: 'incompatible', reasonCode: 'equipment_missing' };
  }
  const region = profile.regions[exercise.primaryRegion] ?? 'neutral'; // missing key is fine, not a hard no
  if (region === 'avoid') {
    return { status: 'incompatible', reasonCode: 'region_avoided' };
  }
  if (region === 'limited') {
    // still allowed, just not first pick
    return { status: 'caution', reasonCode: 'region_limited' };
  }
  return { status: 'compatible', reasonCode: 'eligible' };
};
