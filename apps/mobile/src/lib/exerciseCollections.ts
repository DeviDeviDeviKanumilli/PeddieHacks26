import type { Exercise } from '@/types';

export type ExerciseCollectionId = 'upper-body' | 'lower-body' | 'core-balance' | 'seated-movement';

export type ExerciseCollection = {
  id: ExerciseCollectionId;
  title: string;
  description: string;
  mark: Exercise['category'];
  tone: Exercise['category'];
  matches: (exercise: Exercise) => boolean;
};

const hasMuscle = (exercise: Exercise, names: readonly string[]) =>
  exercise.muscles.some((muscle) => names.some((name) => muscle.toLowerCase().includes(name)));

// views over the catalog, not a second list to keep in sync.
export const exerciseCollections: readonly ExerciseCollection[] = [
  {
    id: 'upper-body',
    title: 'Upper body',
    description: 'Arms, shoulders, chest, and upper-back movement.',
    mark: 'strength',
    tone: 'strength',
    matches: (exercise) =>
      hasMuscle(exercise, ['biceps', 'forearm', 'upper back', 'chest', 'triceps', 'shoulder']),
  },
  {
    id: 'lower-body',
    title: 'Lower body',
    description: 'Hips, legs, ankles, and supported standing movement.',
    mark: 'strength',
    // cardio tone so the chip doesn't look identical to upper body.
    tone: 'cardio',
    matches: (exercise) =>
      hasMuscle(exercise, ['quadriceps', 'glutes', 'calves', 'ankles', 'hip flexor']),
  },
  {
    id: 'core-balance',
    title: 'Core & balance',
    description: 'Controlled trunk movement and steady support.',
    mark: 'balance',
    tone: 'balance',
    matches: (exercise) => exercise.category === 'balance' || hasMuscle(exercise, ['core', 'back']),
  },
  {
    id: 'seated-movement',
    title: 'Seated movement',
    description: 'Exercises designed around a stable seated base.',
    mark: 'mobility',
    tone: 'mobility',
    // position is the source of truth; don't infer from equipment.
    matches: (exercise) => exercise.position === 'seated',
  },
] as const;

// unknown ids return undefined so the collection screen can 404.
export const getExerciseCollection = (id: string | undefined) =>
  exerciseCollections.find((collection) => collection.id === id);

export const exercisesInCollection = (
  exercises: readonly Exercise[],
  collection: ExerciseCollection,
) => exercises.filter(collection.matches);
