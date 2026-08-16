import type { Exercise, MovementProfile, Workout, WorkoutItem } from '@/types';

const usesAny = (exercise: Exercise, terms: readonly string[]): boolean => {
  const text = `${exercise.slug} ${exercise.muscles.join(' ')}`.toLowerCase();
  return terms.some((term) => text.includes(term));
};

const conflictsWithProfile = (exercise: Exercise, profile: MovementProfile): boolean => {
  const avoided = Object.entries(profile.regions)
    .filter(([, state]) => state === 'avoid')
    .map(([region]) => region);
  if (
    avoided.some((region) => region.includes('knee')) &&
    usesAny(exercise, ['knee', 'sit-to-stand'])
  )
    return true;
  if (avoided.includes('arms') && usesAny(exercise, ['biceps', 'row', 'push-up', 'arms']))
    return true;
  if (avoided.includes('shoulders') && usesAny(exercise, ['shoulder', 'push-up', 'side-reach']))
    return true;
  if (avoided.includes('hips') && usesAny(exercise, ['march', 'sit-to-stand', 'hip'])) return true;
  if (
    (avoided.includes('core') || avoided.includes('lower-back')) &&
    usesAny(exercise, ['torso-rotation', 'side-reach', 'core', 'back'])
  )
    return true;
  if (profile.capabilities.standing === 'avoid' && exercise.position === 'standing') return true;
  return false;
};

export const estimatedWorkoutMinutes = (
  items: readonly Pick<WorkoutItem, 'sets' | 'reps' | 'restSeconds'>[],
): number =>
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

const regionLabel = (id: string) => {
  if (id.includes('knee')) return 'knee';
  if (id.includes('shoulder')) return 'shoulder';
  if (id.includes('hip')) return 'hip';
  if (id.includes('back')) return 'back';
  return id.replaceAll('-', ' ');
};

export const usesExtraEquipment = (exercises: readonly Pick<Exercise, 'equipment'>[]): boolean =>
  exercises.some((exercise) =>
    exercise.equipment.some((item) => {
      const label = item.toLowerCase();
      return label.length > 0 && !label.includes('none') && !label.includes('chair');
    }),
  );

export const planFitReasons = (
  profile: MovementProfile,
  exercises: readonly Exercise[],
): string[] => {
  if (exercises.length === 0) return [];
  const reasons: string[] = [];
  if (exercises.every((exercise) => exercise.position === 'seated')) {
    reasons.push('Seated movements');
  } else if (
    profile.capabilities.standing === 'avoid' ||
    profile.capabilities['seated-posture'] === 'focus'
  ) {
    reasons.push('Seated movements');
  }
  const jumping = exercises.some((exercise) =>
    /jump|hop|plyo|skip/u.test(`${exercise.slug} ${exercise.name} ${exercise.summary}`),
  );
  if (!jumping) reasons.push('No jumping');
  const avoided = Object.entries(profile.regions)
    .filter(([, state]) => state === 'avoid')
    .map(([id]) => id);
  const kneeAvoid = avoided.some((id) => id.includes('knee'));
  if (kneeAvoid) {
    reasons.push('Avoids your saved knee limitation');
  } else {
    const other = avoided[0];
    if (other) reasons.push(`Avoids ${regionLabel(other)}-intensive exercises`);
  }
  if (reasons.length < 3 && !usesExtraEquipment(exercises)) {
    reasons.push('No extra equipment');
  }
  return reasons.slice(0, 3);
};

const equipmentAvailable = (exercise: Exercise, selected: ReadonlySet<string>): boolean => {
  const needs = exercise.equipment.join(' ').toLowerCase();
  if (needs.includes('resistance band') && !needs.includes('dumbbell'))
    return selected.has('Resistance band');
  if (needs.includes('wall')) return selected.has('Wall');
  if (needs.includes('stable chair')) return selected.has('Stable chair');
  if (needs.includes('exercise mat')) return selected.has('Exercise mat');
  if (needs.includes('dumbbell') && !needs.includes('resistance band'))
    return selected.has('Dumbbells');
  return true;
};

const goalScore = (exercise: Exercise, profile: MovementProfile): number => {
  let score = 0;
  if (profile.goals.includes('Build strength') && exercise.category === 'strength') score += 4;
  if (profile.goals.includes('Improve mobility') && exercise.category === 'mobility') score += 4;
  if (profile.goals.includes('Increase endurance') && exercise.category === 'cardio') score += 4;
  if (profile.goals.includes('Improve balance') && exercise.category === 'balance') score += 4;
  const focused = Object.entries(profile.regions)
    .filter(([, state]) => state === 'focus')
    .map(([region]) => region.replace('-', ' '));
  if (usesAny(exercise, focused)) score += 3;
  score += exercise.position === 'seated' ? 1 : 0;
  return score;
};

export const buildGuestWorkout = (
  profile: MovementProfile,
  catalog: readonly Exercise[],
): Workout => {
  const selectedEquipment = new Set(profile.equipment);
  const selected = catalog
    .filter((exercise) => !conflictsWithProfile(exercise, profile))
    .filter((exercise) => equipmentAvailable(exercise, selectedEquipment))
    .map((exercise, index) => ({ exercise, index, score: goalScore(exercise, profile) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 4)
    .map(({ exercise }) => exercise);
  const items = selected.map((exercise, index) => ({
    id: `guest-item-${index + 1}`,
    exerciseSlug: exercise.slug,
    sets: exercise.sets,
    reps: exercise.reps,
    restSeconds: exercise.restSeconds,
  }));
  return {
    id: 'guest-workout-1',
    title: selected.length >= 3 ? 'Your adaptive movement' : 'Your focused movement',
    durationMinutes: Math.max(5, estimatedWorkoutMinutes(items)),
    focus: profile.goals.join(' + ') || 'Movement that fits today',
    items,
  };
};
