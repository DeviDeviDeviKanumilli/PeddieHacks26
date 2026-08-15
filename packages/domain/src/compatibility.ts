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
  high: 5,
};

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
  const reasons: CompatibilityReason[] = [];
  const equipmentIds = new Set(options.equipmentIds ?? profile.equipmentIds);
  const intensityPreference = options.intensityPreference ?? profile.intensityPreference;

  if (!exercise.active) {
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
    const state = profile.bodyRegions[demand.regionId] ?? 'neutral';

    if (state === 'avoid') {
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
          demand.demand === 'high'
            ? 'This exercise places high demand on a limited body region.'
            : 'This exercise uses a body region marked as limited.',
          demand.regionId,
        ),
      );
    }
  }

  for (const demand of exercise.capabilityDemands) {
    const state = profile.capabilities[demand.capabilityId] ?? 'unknown';

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
      return;
    }

    const group = option.orGroup ?? `equipment-${index}`;
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
          group,
        ),
      );
    }
  }

  if (options.trackingRequired === true && exercise.trackingProfileKey === undefined) {
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
  const status = hasConflict ? 'incompatible' : warningCount > 0 ? 'caution' : 'compatible';
  const score = status === 'incompatible' ? 0 : Math.max(0, 100 - warningCount * 20);

  return {
    exerciseId: exercise.id,
    exerciseSlug: exercise.slug,
    status,
    score,
    engineVersion: COMPATIBILITY_ENGINE_VERSION,
    reasons,
  };
};
