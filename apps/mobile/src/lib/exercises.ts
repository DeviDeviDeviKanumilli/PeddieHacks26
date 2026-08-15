import type { ExerciseDetail } from '@peddie/contracts';
import type { Exercise } from '@/types';

const humanize = (value: string): string =>
  value
    .split(/[-_]/u)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

export const exerciseFromApi = (detail: ExerciseDetail, fallback?: Exercise): Exercise => ({
  id: detail.id,
  slug: detail.slug,
  name: detail.name,
  summary: detail.summary,
  category: detail.category,
  position: detail.position,
  difficulty: detail.difficulty,
  sets: detail.defaultPrescription.sets,
  reps: detail.defaultPrescription.reps ?? fallback?.reps ?? 1,
  restSeconds: detail.defaultPrescription.restSeconds,
  muscles: detail.muscles.map(({ muscleGroupId }) => humanize(muscleGroupId)),
  equipment:
    detail.equipmentOptions.length > 0
      ? detail.equipmentOptions.map(({ equipmentId }) => humanize(equipmentId))
      : ['None'],
  instructions: detail.instructions,
  safetyCues: detail.safetyCues,
  adaptations: detail.adaptations,
  compatibility: fallback?.compatibility ?? 'compatible',
  compatibilityReason:
    fallback?.compatibilityReason ?? 'Available in the reviewed AdaptFit exercise catalog.',
  trackingSupported: detail.trackingSupported,
});
