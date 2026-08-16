import { evaluateCompatibility } from './compatibility.js';
import type { CatalogExercise, MovementProfile, WorkoutItem } from './types.js';

const REST_SECONDS = 45;

export const generateWorkout = (
  profile: MovementProfile,
  catalog: readonly CatalogExercise[],
  limit = 4,
): WorkoutItem[] => {
  const eligible = catalog
    .map((exercise) => ({ exercise, result: evaluateCompatibility(exercise, profile) }))
    .filter((entry) => entry.result.status !== 'incompatible')
    .sort(
      (left, right) =>
        Number(left.result.status === 'caution') - Number(right.result.status === 'caution'),
    );

  const items: WorkoutItem[] = [];
  const usedRegions = new Set<string>();
  for (const { exercise } of eligible) {
    if (items.length >= limit) break;
    if (usedRegions.has(exercise.primaryRegion) && eligible.length - items.length > 1) {
      continue;
    }
    usedRegions.add(exercise.primaryRegion);
    items.push({
      exerciseId: exercise.id,
      sets: exercise.defaultSets,
      reps: exercise.defaultReps,
      restSeconds: exercise.defaultRestSeconds || REST_SECONDS,
    });
  }
  if (items.length < limit) {
    for (const { exercise } of eligible) {
      if (items.some((item) => item.exerciseId === exercise.id)) continue;
      items.push({
        exerciseId: exercise.id,
        sets: exercise.defaultSets,
        reps: exercise.defaultReps,
        restSeconds: exercise.defaultRestSeconds || REST_SECONDS,
      });
      if (items.length >= limit) break;
    }
  }
  return items;
};

export const estimateMinutes = (items: readonly WorkoutItem[]): number =>
  Math.max(
    1,
    Math.round(
      items.reduce(
        (seconds, item) =>
          seconds + item.sets * item.reps * 3 + Math.max(0, item.sets - 1) * item.restSeconds,
        0,
      ) / 60,
    ),
  );
