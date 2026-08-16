// compatibility-v1. collect every reason, then fail if any conflict showed up.
// missing body regions are neutral; missing capabilities are unknown. those defaults are not the same.
import {
  COMPATIBILITY_ENGINE_VERSION,
  type CompatibilityOptions,
  type CompatibilityReason,
  type CompatibilityResult,
  type ExerciseCandidate,
  type IntensityPreference,
  type MovementProfile,
} from './types.js';

const maximumDifficulty: Record<IntensityPreference, number> = {
  low: 2,
  standard: 4,
  high: 5, // 5 is the catalog ceiling. do not invent a 6 to "stretch" high.
};

// omit relatedId when it is undefined so json clients do not see a null field.
const reason = (
  code: CompatibilityReason['code'],
  severity: CompatibilityReason['severity'],
  message: string,
  relatedId?: string,
): CompatibilityReason => {
  if (relatedId === undefined) {
    return { code, severity, message };
  }

  return { code, severity, message, relatedId };
};

export const evaluateCompatibility = (
  exercise: ExerciseCandidate,
  profile: MovementProfile,
  options: CompatibilityOptions = {},
): CompatibilityResult => {
  // collect every reason, then decide. one conflict is enough to fail.
  const reasons: CompatibilityReason[] = [];
  const equipmentIds = new Set(options.equipmentIds ?? profile.equipmentIds); // request override wins
  const intensityPreference = options.intensityPreference ?? profile.intensityPreference;

  if (!exercise.active) {
    // retired catalog rows. still a conflict so old ids cannot sneak into a generated plan.
    reasons.push(reason('inactive_exercise', 'conflict', 'This exercise is not currently active.'));
  }

  if (exercise.difficulty > maximumDifficulty[intensityPreference]) {
    reasons.push(
      reason(
        'intensity_exceeded',
        'conflict',
        'This exercise exceeds the requested intensity preference.',
      ),
    );
  }

  for (const demand of exercise.bodyDemands) {
    const state = profile.bodyRegions[demand.regionId] ?? 'neutral'; // unspecified region is fine, unlike capabilities

    if (state === 'avoid') {
      // light stabilizing on an avoided region is a warning. anything else is a hard no.
      const activeDemand = demand.involvement !== 'stabilizing' || demand.demand === 'high';
      reasons.push(
        reason(
          'avoided_body_region',
          activeDemand ? 'conflict' : 'warning',
          activeDemand
            ? 'This exercise uses a body region marked as unavailable.'
            : 'This exercise uses an avoided body region for stabilization.',
          demand.regionId,
        ),
      );
    } else if (state === 'limited') {
      reasons.push(
        reason(
          'limited_body_region',
          demand.demand === 'high' ? 'conflict' : demand.demand === 'moderate' ? 'warning' : 'info',
          // high on limited is the only limited-region conflict.
          demand.demand === 'high'
            ? 'This exercise places high demand on a limited body region.'
            : 'This exercise uses a body region marked as limited.',
          demand.regionId,
        ),
      );
    }
  }

  for (const demand of exercise.capabilityDemands) {
    const state = profile.capabilities[demand.capabilityId] ?? 'unknown'; // missing key means unconfirmed

    if (state === 'unknown' && demand.required) {
      reasons.push(
        reason(
          'unknown_required_capability',
          'conflict',
          'A required movement capability has not been confirmed.',
          demand.capabilityId,
        ),
      );
    } else if (state === 'avoid') {
      // optional capability + avoid is still a warning. required + avoid is the hard no.
      reasons.push(
        reason(
          'avoided_required_capability',
          demand.required ? 'conflict' : 'warning',
          demand.required
            ? 'This exercise requires a movement capability marked as unavailable.'
            : 'This exercise may use a movement capability marked as unavailable.',
          demand.capabilityId,
        ),
      );
    } else if (state === 'limited' && demand.required) {
      // limited capability is caution, not a hard fail. they can still try it.
      reasons.push(
        reason(
          'limited_required_capability',
          'warning',
          'This exercise requires a movement capability marked as limited.',
          demand.capabilityId,
        ),
      );
    }
  }

  const requiredEquipmentGroups = new Map<string, string[]>();
  exercise.equipmentOptions.forEach((option, index) => {
    if (option.mode !== 'required') {
      return; // optional gear never fails compatibility
    }

    const group = option.orGroup ?? `equipment-${index}`; // no orGroup = its own group, must have that item
    const equipment = requiredEquipmentGroups.get(group) ?? [];
    equipment.push(option.equipmentId);
    requiredEquipmentGroups.set(group, equipment);
  });

  for (const [group, equipment] of requiredEquipmentGroups) {
    if (equipment.every((equipmentId) => !equipmentIds.has(equipmentId))) {
      reasons.push(
        reason(
          'missing_required_equipment',
          'conflict',
          'A required equipment option is not available.',
          group, // relatedId is the or-group key, not a single equipment id
        ),
      );
    }
  }

  if (options.trackingRequired === true && exercise.trackingProfileKey === undefined) {
    // opt-in from the caller. still compatible so a manual session can proceed.
    reasons.push(
      reason(
        'tracking_not_supported',
        'warning',
        'This exercise does not have the requested tracking profile.',
      ),
    );
  }

  const hasConflict = reasons.some((item) => item.severity === 'conflict');
  const warningCount = reasons.filter((item) => item.severity === 'warning').length;
  // info reasons do not change status. they are just extra context on a pass.
  const status = hasConflict ? 'incompatible' : warningCount > 0 ? 'caution' : 'compatible';
  const score = status === 'incompatible' ? 0 : Math.max(0, 100 - warningCount * 20); // 20 points per warning, floor at 0

  return {
    exerciseId: exercise.id,
    exerciseSlug: exercise.slug,
    status,
    score,
    engineVersion: COMPATIBILITY_ENGINE_VERSION,
    reasons,
  };
};
