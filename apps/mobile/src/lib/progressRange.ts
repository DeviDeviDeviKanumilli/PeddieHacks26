import type { ProgressActivity } from '@/lib/api';
import type { WorkoutHistory } from '@/types';

const dayMs = 86_400_000;

export type ProgressRangeId = '7d' | '28d' | '84d';

export const progressRanges = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '28d', label: 'Last 4 weeks', days: 28 },
  { id: '84d', label: 'Last 12 weeks', days: 84 },
] as const;

export const getProgressRange = (id: ProgressRangeId) =>
  progressRanges.find((range) => range.id === id) ?? progressRanges[1];

const utcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

export const progressRangeBounds = (id: ProgressRangeId, now = new Date()) => {
  const range = getProgressRange(id);
  const end = utcDay(now);
  const start = new Date(end.getTime() - (range.days - 1) * dayMs);
  return { startDate: dateOnly(start), endDate: dateOnly(end), days: range.days };
};

export const historyInProgressRange = (
  history: readonly WorkoutHistory[],
  id: ProgressRangeId,
  now = new Date(),
) => {
  const { startDate, endDate } = progressRangeBounds(id, now);
  return history.filter(({ completedAt }) => {
    const completedDate = completedAt.slice(0, 10);
    return completedDate >= startDate && completedDate <= endDate;
  });
};

export const localProgressActivity = (
  history: readonly WorkoutHistory[],
  id: ProgressRangeId,
  now = new Date(),
): ProgressActivity[] => {
  const rows = new Map<string, ProgressActivity>();
  for (const item of historyInProgressRange(history, id, now)) {
    const activityDate = item.completedAt.slice(0, 10);
    const current = rows.get(activityDate);
    rows.set(activityDate, {
      activityDate,
      sessionCount: (current?.sessionCount ?? 0) + 1,
      exerciseCount: (current?.exerciseCount ?? 0) + item.exercises,
      setCount: current?.setCount ?? 0,
      repCount: (current?.repCount ?? 0) + item.reps,
      activeSeconds: (current?.activeSeconds ?? 0) + item.durationSeconds,
      averageScore: null,
    });
  }
  return [...rows.values()].sort((left, right) =>
    left.activityDate.localeCompare(right.activityDate),
  );
};

export const fillProgressActivity = (
  activity: readonly ProgressActivity[],
  id: ProgressRangeId,
  now = new Date(),
) => {
  const { startDate, days } = progressRangeBounds(id, now);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const byDate = new Map(activity.map((row) => [row.activityDate, row]));
  return Array.from({ length: days }, (_, index) => {
    const activityDate = dateOnly(new Date(start.getTime() + index * dayMs));
    return (
      byDate.get(activityDate) ?? {
        activityDate,
        sessionCount: 0,
        exerciseCount: 0,
        setCount: 0,
        repCount: 0,
        activeSeconds: 0,
        averageScore: null,
      }
    );
  });
};

export const summarizeProgressActivity = (activity: readonly ProgressActivity[]) =>
  activity.reduce(
    (summary, row) => ({
      activeSeconds: summary.activeSeconds + row.activeSeconds,
      sessions: summary.sessions + row.sessionCount,
      exercises: summary.exercises + row.exerciseCount,
      reps: summary.reps + row.repCount,
    }),
    { activeSeconds: 0, sessions: 0, exercises: 0, reps: 0 },
  );
