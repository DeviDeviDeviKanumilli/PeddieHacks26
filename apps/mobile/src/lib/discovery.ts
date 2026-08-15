import type { Exercise, RegionState } from '@/types';

export type DiscoveryFilters = {
  catalog: readonly Exercise[];
  regions: Readonly<Record<string, RegionState>>;
  personalized: boolean;
  category: string;
  query: string;
};

const adaptForRegions = (
  exercise: Exercise,
  regions: Readonly<Record<string, RegionState>>,
): Exercise => {
  const kneeAvoid = regions['left-knee'] === 'avoid' || regions['right-knee'] === 'avoid';
  if (kneeAvoid && exercise.slug === 'sit-to-stand') {
    return {
      ...exercise,
      compatibility: 'incompatible',
      compatibilityReason:
        'This movement asks both knees to bear weight. Seated alternatives are available.',
    };
  }
  if (kneeAvoid && exercise.slug === 'seated-knee-extension') {
    return {
      ...exercise,
      compatibility: 'caution',
      compatibilityReason:
        'You marked a knee to avoid. Review the range or choose a different movement.',
    };
  }
  return exercise;
};

export const discoverExercises = ({
  catalog,
  regions,
  personalized,
  category,
  query,
}: DiscoveryFilters): Exercise[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return catalog
    .map((exercise) => adaptForRegions(exercise, regions))
    .filter((exercise) => !personalized || exercise.compatibility !== 'incompatible')
    .filter((exercise) => category === 'All' || exercise.category === category.toLowerCase())
    .filter((exercise) =>
      `${exercise.name} ${exercise.muscles.join(' ')}`.toLowerCase().includes(normalizedQuery),
    );
};
