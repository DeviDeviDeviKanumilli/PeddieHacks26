import type { Exercise, RegionState } from '@/types';

export type DiscoveryFilters = {
  catalog: readonly Exercise[];
  regions: Readonly<Record<string, RegionState>>;
  personalized: boolean;
  category: string;
  query: string;
};

// guest compatibility overlay. live mode still uses domain scoring on the server.
const adaptForRegions = (
  exercise: Exercise,
  regions: Readonly<Record<string, RegionState>>,
): Exercise => {
  const kneeAvoid = regions['left-knee'] === 'avoid' || regions['right-knee'] === 'avoid';
  // sit-to-stand loads both knees; hide it from personalized lists, keep a reason in the full catalog.
  if (kneeAvoid && exercise.slug === 'sit-to-stand') {
    return {
      ...exercise,
      compatibility: 'incompatible',
      compatibilityReason:
        'This movement asks both knees to bear weight. Seated alternatives are available.',
    };
  }
  // extension can stay visible with a caution so we don't empty the lower-body list.
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
  return (
    catalog
      .map((exercise) => adaptForRegions(exercise, regions))
      // personalized = "fits me"; unpersonalized still shows incompatible rows with copy.
      .filter((exercise) => !personalized || exercise.compatibility !== 'incompatible')
      .filter((exercise) => category === 'All' || exercise.category === category.toLowerCase())
      .filter((exercise) =>
        `${exercise.name} ${exercise.muscles.join(' ')}`.toLowerCase().includes(normalizedQuery),
      )
  );
};
