import {
  fillProgressActivity,
  historyInProgressRange,
  localProgressActivity,
  progressRangeBounds,
  summarizeProgressActivity,
} from '@/lib/progressRange';
import type { WorkoutHistory } from '@/types';

// utc day windows so guest history and live activity charts share bounds.

const now = new Date('2026-08-15T18:00:00.000Z');
const history: WorkoutHistory[] = [
  {
    id: 'recent',
    title: 'Recent workout',
    completedAt: '2026-08-14T12:00:00.000Z',
    durationSeconds: 900,
    exercises: 3,
    reps: 24,
    averageScore: 90,
  },
  {
    id: 'old',
    title: 'Old workout',
    completedAt: '2026-07-01T12:00:00.000Z',
    durationSeconds: 600,
    exercises: 2,
    reps: 16,
    averageScore: 80,
  },
];

describe('progress ranges', () => {
  it('creates inclusive date windows', () => {
    // 7d is today plus the previous six utc days, not a rolling 168 hours.
    expect(progressRangeBounds('7d', now)).toEqual({
      startDate: '2026-08-09',
      endDate: '2026-08-15',
      days: 7,
    });
  });

  it('filters, fills, and summarizes only the selected range', () => {
    // fill empty days or the chart axis compresses.
    expect(historyInProgressRange(history, '28d', now).map(({ id }) => id)).toEqual(['recent']);

    const activity = localProgressActivity(history, '28d', now);
    const filled = fillProgressActivity(activity, '28d', now);
    expect(filled).toHaveLength(28);
    expect(summarizeProgressActivity(filled)).toEqual({
      activeSeconds: 900,
      sessions: 1,
      exercises: 3,
      reps: 24,
    });
  });
});
