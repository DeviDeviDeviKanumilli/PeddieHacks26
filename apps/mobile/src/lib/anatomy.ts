import type { ExerciseVisualKey, MuscleActivation, MuscleRegionId, MuscleRole } from '@/types';

export const muscleLabels: Record<MuscleRegionId, string> = {
  shoulders: 'Shoulders',
  chest: 'Chest',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  'upper-back': 'Upper back',
  'lower-back': 'Lower back',
  core: 'Core',
  'hip-flexors': 'Hip flexors',
  glutes: 'Glutes',
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  'ankles-feet': 'Ankles and feet',
};

const aliases: Record<string, MuscleRegionId[]> = {
  shoulders: ['shoulders'],
  chest: ['chest'],
  arms: ['biceps', 'triceps'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearms'],
  back: ['upper-back', 'lower-back'],
  'upper-back': ['upper-back'],
  'lower-back': ['lower-back'],
  core: ['core'],
  obliques: ['core'],
  hips: ['hip-flexors', 'glutes'],
  'hip-flexors': ['hip-flexors'],
  glutes: ['glutes'],
  quadriceps: ['quadriceps'],
  thighs: ['quadriceps', 'hamstrings'],
  hamstrings: ['hamstrings'],
  calves: ['calves'],
  ankles: ['ankles-feet'],
  'ankles-feet': ['ankles-feet'],
};

const normalize = (value: string): string =>
  value.trim().toLowerCase().replaceAll('_', '-').replace(/\s+/gu, '-');

export const muscleIdsForLabel = (value: string): MuscleRegionId[] => {
  const normalized = normalize(value);
  return aliases[normalized] ?? [];
};

export const inferMuscleActivations = (muscles: string[]): MuscleActivation[] => {
  const seen = new Set<MuscleRegionId>();
  return muscles.flatMap((muscle, index) => {
    const role: MuscleRole = index === 0 ? 'primary' : index === 1 ? 'secondary' : 'stabilizer';
    const intensity = (index === 0 ? 4 : index === 1 ? 3 : 2) as 2 | 3 | 4;
    return muscleIdsForLabel(muscle).flatMap((id) => {
      if (seen.has(id)) return [];
      seen.add(id);
      return [{ id, role, intensity }];
    });
  });
};

export const inferVisualKey = ({
  slug,
  position,
  category,
}: {
  slug: string;
  position: string;
  category: string;
}): ExerciseVisualKey => {
  if (slug.includes('row') || slug.includes('pull')) return 'seated-pull';
  if (slug.includes('wall') || position === 'standing') return 'wall-supported';
  if (
    slug.includes('curl') ||
    slug.includes('press') ||
    slug.includes('raise') ||
    slug.includes('upper')
  )
    return 'seated-strength';
  if (category === 'mobility' || category === 'cardio' || category === 'balance')
    return 'seated-mobility';
  return position === 'seated' ? 'seated-mobility' : 'wall-supported';
};

export const combineMuscleLoad = (
  activations: MuscleActivation[][],
): Partial<Record<MuscleRegionId, number>> => {
  const load: Partial<Record<MuscleRegionId, number>> = {};
  for (const exercise of activations) {
    for (const activation of exercise) {
      load[activation.id] = (load[activation.id] ?? 0) + activation.intensity;
    }
  }
  return load;
};

export const activationsFromLoad = (
  load: Partial<Record<MuscleRegionId, number>>,
): MuscleActivation[] => {
  const highest = Math.max(0, ...Object.values(load));
  if (highest === 0) return [];
  return Object.entries(load).map(([id, value]) => {
    const ratio = value / highest;
    const role: MuscleRole = ratio >= 0.72 ? 'primary' : ratio >= 0.4 ? 'secondary' : 'stabilizer';
    const intensity = Math.max(1, Math.min(5, Math.round(ratio * 5))) as 1 | 2 | 3 | 4 | 5;
    return { id: id as MuscleRegionId, role, intensity };
  });
};
