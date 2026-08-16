import type { Workout, WorkoutItem } from '@/types';

// expo-router params arrive as strings. junk values should not skip the first item.
export const parseNonNegativeInt = (value: string | undefined, fallback = 0): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const compactSearchParams = (
  entries: Record<string, string | string[] | undefined | null>,
): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    // router can pass string[]; we only need the first. empty keys leak into later screens.
    const scalar = Array.isArray(value) ? value[0] : value;
    if (scalar == null || scalar === '') continue;
    params.set(key, scalar);
  }
  return params.toString();
};

// guest and live session screens share this so index math stays in one place.
export const currentWorkoutItem = (workout: Workout, itemIndex: number): WorkoutItem | undefined =>
  workout.items[itemIndex];

// undefined means this was the last item; complete screen takes over.
export const nextWorkoutItem = (
  workout: Workout,
  itemIndex: number,
): { item: WorkoutItem; index: number } | undefined => {
  const index = itemIndex + 1;
  const item = workout.items[index];
  return item ? { item, index } : undefined;
};
