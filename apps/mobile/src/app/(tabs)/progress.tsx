import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnatomyMap } from '@/components/AnatomyMap';
import { AppHeader } from '@/components/AppHeader';
import { Body, Screen, SectionHeading } from '@/components/ui';
import { activationsFromLoad } from '@/lib/anatomy';
import { mobileApi } from '@/lib/api';
import { hasApiConfig } from '@/lib/config';
import {
  fillProgressActivity,
  getProgressRange,
  historyInProgressRange,
  localProgressActivity,
  type ProgressRangeId,
  progressRangeBounds,
  progressRanges,
  summarizeProgressActivity,
} from '@/lib/progressRange';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

// four heat levels for the activity grid. 0 is empty, 3 is a long day.
const activityLevel = (seconds: number) => {
  if (seconds === 0) return 0;
  if (seconds < 600) return 1;
  if (seconds < 1_200) return 2;
  return 3;
};

const formatActiveTime = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
};

const formatDate = (value: string) =>
  // utc so a local offset doesn't slide a "day" into the previous cell.
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(value),
  );

const RangeSelector = ({
  value,
  onChange,
}: {
  value: ProgressRangeId;
  onChange: (value: ProgressRangeId) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selected = getProgressRange(value);
  // custom menu instead of a picker — keeps 44pt rows and matches the rest of the app.
  return (
    <View style={styles.rangeWrap}>
      <Pressable
        accessibilityLabel={`Progress range, ${selected.label}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.rangeButton, pressed && styles.pressed]}
      >
        <Text style={styles.rangeButtonText}>{selected.label}</Text>
        <ChevronDown color={colors.muted} size={17} />
      </Pressable>
      {open ? (
        <View accessibilityRole="menu" style={styles.rangeMenu}>
          {progressRanges.map((range) => {
            const active = range.id === value;
            return (
              <Pressable
                accessibilityRole="menuitem"
                accessibilityState={{ selected: active }}
                key={range.id}
                onPress={() => {
                  onChange(range.id);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.rangeOption, pressed && styles.pressed]}
              >
                <Text style={[styles.rangeOptionText, active && styles.rangeOptionTextActive]}>
                  {range.label}
                </Text>
                {active ? <Check color={colors.lavenderDark} size={16} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    {/* shrink-to-fit so four stats share a row on small phones. */}
    <Text adjustsFontSizeToFit numberOfLines={1} style={styles.statValue}>
      {value}
    </Text>
    <Text numberOfLines={2} style={styles.statLabel}>
      {label}
    </Text>
  </View>
);

export default function ProgressScreen() {
  const [rangeId, setRangeId] = useState<ProgressRangeId>('28d');
  // 28d default: enough cells to look like a heatmap without crowding the map.
  const history = useAppStore((state) => state.history);
  const mode = useAppStore((state) => state.mode);
  const range = getProgressRange(rangeId);
  const bounds = useMemo(() => progressRangeBounds(rangeId), [rangeId]);
  const liveActivity = useQuery({
    queryKey: ['progress-activity', rangeId, bounds.startDate, bounds.endDate],
    queryFn: () =>
      mobileApi.getProgressActivity({
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        limit: bounds.days,
      }),
    enabled: mode === 'live' && hasApiConfig,
  });
  // guest reads local history. live waits on this query — don't fall back mid-fetch.

  const rangeHistory = useMemo(() => historyInProgressRange(history, rangeId), [history, rangeId]);
  const sourceActivity =
    mode === 'live' && hasApiConfig
      ? (liveActivity.data ?? [])
      : localProgressActivity(history, rangeId);
  // don't mix live + local rows; empty live response still means "wait for the query".
  const activity = useMemo(
    () => fillProgressActivity(sourceActivity, rangeId),
    [rangeId, sourceActivity],
  );
  const summary = useMemo(() => summarizeProgressActivity(activity), [activity]);
  const cellSize = range.days > 28 ? 16 : range.days > 7 ? 24 : 30;

  const muscleLoad = rangeHistory.reduce<Record<string, number>>((totals, item) => {
    for (const [id, load] of Object.entries(item.muscleLoad ?? {})) {
      totals[id] = (totals[id] ?? 0) + load;
    }
    return totals;
  }, {});
  const muscleActivations = activationsFromLoad(muscleLoad);

  return (
    <Screen style={styles.screen}>
      <AppHeader />
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Progress
        </Text>
        <RangeSelector onChange={setRangeId} value={rangeId} />
      </View>

      <View accessibilityLabel={`${range.label} summary`} style={styles.stats}>
        <Stat label="Active time" value={formatActiveTime(summary.activeSeconds)} />
        <View style={styles.statDivider} />
        <Stat label="Workouts" value={String(summary.sessions)} />
        <View style={styles.statDivider} />
        <Stat label="Exercises" value={String(summary.exercises)} />
        <View style={styles.statDivider} />
        <Stat label="Reps" value={String(summary.reps)} />
      </View>

      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Activity
        </Text>
        <Text style={styles.sectionMeta}>
          {summary.sessions} workout{summary.sessions === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.activityPanel}>
        <View
          accessibilityLabel={`${range.label} activity grid with ${summary.sessions} workouts`}
          style={styles.grid}
        >
          {activity.map((row) => {
            const level = activityLevel(row.activeSeconds);
            return (
              <View
                accessibilityLabel={`${row.activityDate}, ${row.sessionCount} workouts`}
                key={row.activityDate}
                style={[
                  styles.cell,
                  { height: cellSize, width: cellSize },
                  level === 1 && styles.levelOne,
                  level === 2 && styles.levelTwo,
                  level === 3 && styles.levelThree,
                ]}
              />
            );
          })}
        </View>
        <View style={styles.activityFooter}>
          <Text style={styles.dateLabel}>{formatDate(`${bounds.startDate}T00:00:00.000Z`)}</Text>
          <View style={styles.legend}>
            <Text style={styles.legendLabel}>Less</Text>
            <View style={styles.legendCell} />
            <View style={[styles.legendCell, styles.levelOne]} />
            <View style={[styles.legendCell, styles.levelTwo]} />
            <View style={[styles.legendCell, styles.levelThree]} />
            <Text style={styles.legendLabel}>More</Text>
          </View>
          <Text style={styles.dateLabel}>{formatDate(`${bounds.endDate}T00:00:00.000Z`)}</Text>
        </View>
      </View>

      <SectionHeading title="Muscle groups hit" />
      {muscleActivations.length > 0 ? (
        <AnatomyMap activations={muscleActivations} compact />
      ) : (
        <View style={styles.emptySection}>
          <Text style={styles.emptyTitle}>No muscle activity in this range</Text>
          <Body muted>Complete an exercise to begin building your muscle coverage map.</Body>
        </View>
      )}

      <SectionHeading title="Recent workouts" />
      {rangeHistory.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyTitle}>No completed workouts</Text>
          <Body muted>Your completed sessions will appear here.</Body>
        </View>
      ) : (
        <View style={styles.historyList}>
          {rangeHistory.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <View style={styles.historyCopy}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historyDate}>{formatDate(item.completedAt)}</Text>
              </View>
              <Text style={styles.historyMeta}>
                {Math.round(item.durationSeconds / 60)} min · {item.reps} reps
              </Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.sm, paddingTop: spacing.xs },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 32,
    letterSpacing: -0.7,
  },
  rangeWrap: { position: 'relative', zIndex: 10 },
  // menu is absolute; stacking keeps it above the heatmap. 44pt trigger.
  rangeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  rangeButtonText: { color: colors.ink, fontFamily: typography.medium, fontSize: 13 },
  rangeMenu: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 50,
    width: 176,
    zIndex: 20,
  },
  rangeOption: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  rangeOptionText: { color: colors.muted, fontFamily: typography.medium, fontSize: 13 },
  rangeOptionTextActive: { color: colors.ink, fontFamily: typography.semibold },
  stats: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  stat: { alignItems: 'center', flex: 1, gap: spacing.xxs, minWidth: 0 },
  statDivider: { backgroundColor: colors.line, width: 1 },
  statValue: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 20 },
  sectionMeta: { color: colors.muted, fontFamily: typography.medium, fontSize: 12 },
  activityPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  cell: { backgroundColor: colors.line, borderRadius: 4 },
  levelOne: { backgroundColor: '#C9C5EC' },
  levelTwo: { backgroundColor: colors.lavender },
  levelThree: { backgroundColor: colors.lavenderDark },
  activityFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: { color: colors.muted, fontFamily: typography.medium, fontSize: 10 },
  legend: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  legendCell: { backgroundColor: colors.line, borderRadius: 2, height: 9, width: 9 },
  legendLabel: { color: colors.muted, fontFamily: typography.medium, fontSize: 9 },
  emptySection: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: spacing.xxs,
    paddingBottom: spacing.lg,
  },
  emptyTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 16 },
  historyList: { borderTopColor: colors.line, borderTopWidth: 1 },
  historyRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 68,
    paddingVertical: spacing.sm,
  },
  historyCopy: { flex: 1, gap: 2 },
  historyTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 15 },
  historyDate: { color: colors.muted, fontFamily: typography.body, fontSize: 12 },
  historyMeta: { color: colors.muted, fontFamily: typography.medium, fontSize: 12 },
  pressed: { opacity: 0.68 },
});
