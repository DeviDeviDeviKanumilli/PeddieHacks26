import { evaluateCompatibility } from './compatibility.js';
import {
  type ExerciseCandidate,
  GENERATION_ENGINE_VERSION,
  type GeneratedWorkout,
  type GeneratedWorkoutItem,
  type GenerationRequest,
  InsufficientCompatibleExercisesError,
  type RankedExercise,
  type RankingRequest,
} from './types.js';
import { clamp } from './utils.js';

const overlapCount = (left: readonly string[], right: readonly string[]): number => {
  const rightSet = new Set(right);
  return left.reduce((count, value) => count + (rightSet.has(value) ? 1 : 0), 0);
};

const focusRegionIds = (request: RankingRequest): string[] =>
  Object.entries(request.profile.bodyRegions)
    .filter(([, state]) => state === 'focus')
    .map(([regionId]) => regionId);

const hasHighDemandOverlap = (left: ExerciseCandidate, right: ExerciseCandidate): boolean => {
  const leftRegions = left.bodyDemands
    .filter((demand) => demand.demand === 'high')
    .map((demand) => demand.regionId);
  const rightRegions = right.bodyDemands
    .filter((demand) => demand.demand === 'high')
    .map((demand) => demand.regionId);
  return overlapCount(leftRegions, rightRegions) > 0;
};

export const rankExercises = (request: RankingRequest): RankedExercise[] => {
  const primaryRegionIds = request.primaryRegionIds ?? [];
  const secondaryRegionIds = request.secondaryRegionIds ?? [];
  const goalIds = request.goalIds ?? [];
  const profileFocusIds = focusRegionIds(request);
  const previousFamilies = new Set(request.previousExerciseFamilyKeys ?? []);
  const previousPrimaryRegions = new Set(request.previousPrimaryRegionIds ?? []);

  return request.candidates
    .map((exercise): RankedExercise => {
      const compatibility = evaluateCompatibility(exercise, request.profile, {
        ...(request.equipmentIds === undefined ? {} : { equipmentIds: request.equipmentIds }),
        ...(request.intensityPreference === undefined
          ? {}
          : { intensityPreference: request.intensityPreference }),
      });
      const cautionCount = compatibility.reasons.filter(
        (item) => item.severity === 'warning',
      ).length;
      const availableEquipment = new Set(request.equipmentIds ?? request.profile.equipmentIds);
      const requiredEquipment = exercise.equipmentOptions.filter(
        (option) => option.mode === 'required',
      );
      const hasSimpleEquipment =
        requiredEquipment.length === 0 ||
        requiredEquipment.some((option) => availableEquipment.has(option.equipmentId));

      let score = 50;
      if (overlapCount(primaryRegionIds, exercise.primaryRegionIds) > 0) {
        score += 25;
      } else if (overlapCount(secondaryRegionIds, exercise.primaryRegionIds) > 0) {
        score += 10;
      }
      score += clamp(overlapCount(profileFocusIds, exercise.primaryRegionIds) * 10, 0, 20);
      if (overlapCount(goalIds, exercise.goalIds) > 0) {
        score += 10;
      }
      if (hasSimpleEquipment) {
        score += 5;
      }
      score -= Math.min(30, cautionCount * 15);
      if (previousFamilies.has(exercise.familyKey)) {
        score -= 12;
      }
      if (overlapCount([...previousPrimaryRegions], exercise.primaryRegionIds) > 0) {
        score -= 8;
      }

      return {
        exercise,
        compatibility,
        rankScore: compatibility.status === 'incompatible' ? 0 : clamp(score, 0, 100),
      };
    })
    .sort((left, right) => {
      if (right.rankScore !== left.rankScore) {
        return right.rankScore - left.rankScore;
      }
      return left.exercise.slug.localeCompare(right.exercise.slug);
    });
};

export const exerciseCountForDuration = (durationMinutes: number): number => {
  if (durationMinutes <= 10) {
    return 3;
  }
  if (durationMinutes <= 20) {
    return 4;
  }
  if (durationMinutes <= 30) {
    return 5;
  }
  return 6;
};

const estimateSeconds = (exercise: ExerciseCandidate, sets: number): number =>
  sets * exercise.estimatedSecondsPerSet +
  Math.max(0, sets - 1) * exercise.defaultPrescription.restSeconds;

const withSetCount = (ranked: RankedExercise, sets: number): GeneratedWorkoutItem => {
  const { exercise, compatibility, rankScore } = ranked;
  const base = {
    position: 0,
    exerciseId: exercise.id,
    exerciseSlug: exercise.slug,
    sets,
    restSeconds: exercise.defaultPrescription.restSeconds,
    estimatedSeconds: estimateSeconds(exercise, sets),
    rankScore,
    compatibility,
  };

  if (exercise.defaultPrescription.reps !== undefined) {
    return { ...base, reps: exercise.defaultPrescription.reps };
  }

  return { ...base, holdSeconds: exercise.defaultPrescription.holdSeconds ?? 30 };
};

const selectExercises = (ranked: readonly RankedExercise[], count: number): RankedExercise[] => {
  const compatible = ranked.filter((item) => item.compatibility.status === 'compatible');
  const selected: RankedExercise[] = [];

  const addMatching = (allowRepeatedFamily: boolean, allowHighDemandOverlap: boolean): void => {
    for (const item of compatible) {
      if (
        selected.length >= count ||
        selected.some((selectedItem) => selectedItem.exercise.id === item.exercise.id)
      ) {
        continue;
      }
      const last = selected.at(-1);
      const repeatedFamily = selected.some(
        (selectedItem) => selectedItem.exercise.familyKey === item.exercise.familyKey,
      );
      if (!allowRepeatedFamily && repeatedFamily) {
        continue;
      }
      if (!allowHighDemandOverlap && last && hasHighDemandOverlap(last.exercise, item.exercise)) {
        continue;
      }
      selected.push(item);
    }
  };

  addMatching(false, false);
  addMatching(true, false);
  addMatching(true, true);
  return selected;
};

const adjustPrescription = (
  ranked: readonly RankedExercise[],
  durationMinutes: number,
): GeneratedWorkoutItem[] => {
  const targetSeconds = durationMinutes * 60;
  const minimumSeconds = targetSeconds * 0.85;
  const maximumSeconds = targetSeconds * 1.1;
  const sets = ranked.map((item) => clamp(item.exercise.defaultPrescription.sets, 1, 5));

  const total = (): number =>
    sets.reduce((sum, setCount, index) => {
      const rankedExercise = ranked[index];
      return rankedExercise === undefined
        ? sum
        : sum + estimateSeconds(rankedExercise.exercise, setCount);
    }, 0);

  while (total() < minimumSeconds) {
    let bestIndex = -1;
    let bestProjected = Number.POSITIVE_INFINITY;
    for (let index = 0; index < ranked.length; index += 1) {
      if ((sets[index] ?? 1) >= 5) {
        continue;
      }
      const current = total();
      sets[index] = (sets[index] ?? 1) + 1;
      const projected = Math.abs(targetSeconds - total());
      sets[index] = (sets[index] ?? 1) - 1;
      if (projected < bestProjected || (projected === bestProjected && index < bestIndex)) {
        bestIndex = index;
        bestProjected = projected;
      }
      if (current >= maximumSeconds) {
        break;
      }
    }
    if (bestIndex < 0) {
      break;
    }
    sets[bestIndex] = (sets[bestIndex] ?? 1) + 1;
  }

  while (total() > maximumSeconds) {
    let bestIndex = -1;
    let bestProjected = Number.POSITIVE_INFINITY;
    for (let index = ranked.length - 1; index >= 0; index -= 1) {
      if ((sets[index] ?? 1) <= 1) {
        continue;
      }
      sets[index] = (sets[index] ?? 1) - 1;
      const projected = Math.abs(targetSeconds - total());
      sets[index] = (sets[index] ?? 1) + 1;
      if (projected < bestProjected) {
        bestIndex = index;
        bestProjected = projected;
      }
    }
    if (bestIndex < 0) {
      break;
    }
    sets[bestIndex] = (sets[bestIndex] ?? 1) - 1;
  }

  return ranked.map((item, index) => ({
    ...withSetCount(item, sets[index] ?? 1),
    position: index + 1,
  }));
};

export const generateWorkout = (request: GenerationRequest): GeneratedWorkout => {
  if (
    !Number.isInteger(request.durationMinutes) ||
    request.durationMinutes < 5 ||
    request.durationMinutes > 45
  ) {
    throw new RangeError('Workout duration must be an integer from 5 through 45 minutes.');
  }

  const requestedCount = exerciseCountForDuration(request.durationMinutes);
  const ranked = rankExercises(request);
  const selected = selectExercises(ranked, requestedCount);

  if (selected.length < requestedCount) {
    throw new InsufficientCompatibleExercisesError(requestedCount, selected.length, [
      'Confirm any required capabilities that are currently unknown.',
      'Add available equipment or remove an equipment override.',
      'Broaden the requested focus regions or choose a lower intensity.',
    ]);
  }

  const items = adjustPrescription(selected, request.durationMinutes);
  return {
    engineVersion: GENERATION_ENGINE_VERSION,
    requestedDurationMinutes: request.durationMinutes,
    totalEstimatedSeconds: items.reduce((total, item) => total + item.estimatedSeconds, 0),
    items,
  };
};
