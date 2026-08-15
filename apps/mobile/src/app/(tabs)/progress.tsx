import { CalendarDays, ChevronRight, Clock3, Flame, Repeat2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { Body, Card, Metric, Screen, SectionHeading, Title } from '@/components/ui';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const activityLevels = [
  0, 1, 0, 2, 1, 0, 3, 0, 0, 1, 2, 0, 1, 0, 0, 2, 1, 3, 0, 1, 0, 2, 0, 0, 1, 3, 2, 0,
];
const activity = activityLevels.map((level, day) => ({ day: `day-${day + 1}`, level }));

export default function ProgressScreen() {
  const history = useAppStore((state) => state.history);
  const seconds = history.reduce((sum, item) => sum + item.durationSeconds, 0);
  const reps = history.reduce((sum, item) => sum + item.reps, 0);
  return (
    <Screen>
      <AppHeader />
      <View style={styles.intro}>
        <Title compact>Your movement story</Title>
        <Body muted>
          Progress is consistency, comfort, control, and the choices that made movement possible.
        </Body>
      </View>
      <Card tone="lavender">
        <View style={styles.metrics}>
          <Metric label="Active time" value={`${Math.round(seconds / 60)}m`} />
          <Metric
            label="Exercises"
            value={String(history.reduce((sum, item) => sum + item.exercises, 0))}
          />
          <Metric label="Reps" value={String(reps)} />
        </View>
      </Card>
      <SectionHeading title="Activity" />
      <Card>
        <View style={styles.activityHeader}>
          <View style={styles.activityTitle}>
            <CalendarDays color={colors.lavenderDark} size={20} />
            <Text style={styles.cardTitle}>Last 4 weeks</Text>
          </View>
          <Text style={styles.subtle}>{history.length} workouts</Text>
        </View>
        <View accessibilityLabel="Four week activity grid" style={styles.grid}>
          {activity.map(({ day, level }) => (
            <View
              key={day}
              style={[
                styles.cell,
                level === 1 && styles.levelOne,
                level === 2 && styles.levelTwo,
                level === 3 && styles.levelThree,
              ]}
            />
          ))}
        </View>
        <View style={styles.legend}>
          <Text style={styles.subtle}>Less</Text>
          <View style={styles.cell} />
          <View style={[styles.cell, styles.levelOne]} />
          <View style={[styles.cell, styles.levelTwo]} />
          <View style={[styles.cell, styles.levelThree]} />
          <Text style={styles.subtle}>More</Text>
        </View>
      </Card>
      <SectionHeading title="This week" />
      <View style={styles.weekRow}>
        <Card style={styles.weekCard}>
          <Flame color={colors.warning} size={22} />
          <Text style={styles.weekValue}>{history.length}</Text>
          <Text style={styles.subtle}>sessions</Text>
        </Card>
        <Card style={styles.weekCard}>
          <Clock3 color={colors.success} size={22} />
          <Text style={styles.weekValue}>{Math.round(seconds / 60)}</Text>
          <Text style={styles.subtle}>minutes</Text>
        </Card>
        <Card style={styles.weekCard}>
          <Repeat2 color={colors.lavenderDark} size={22} />
          <Text style={styles.weekValue}>{reps}</Text>
          <Text style={styles.subtle}>reps</Text>
        </Card>
      </View>
      <SectionHeading title="Recent workouts" />
      {history.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>Your first session will appear here.</Text>
          <Body muted>Complete a workout to begin your activity history and movement trends.</Body>
        </Card>
      ) : (
        history.map((item) => (
          <Card key={item.id} style={styles.history}>
            <View style={styles.historyIcon}>
              <Clock3 color={colors.lavenderDark} size={20} />
            </View>
            <View style={styles.historyCopy}>
              <Text style={styles.historyTitle}>{item.title}</Text>
              <Text style={styles.subtle}>
                {Math.round(item.durationSeconds / 60)} min · {item.reps} reps
              </Text>
            </View>
            <ChevronRight color={colors.muted} size={20} />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs, marginTop: spacing.md },
  metrics: { flexDirection: 'row', gap: spacing.md },
  activityHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  activityTitle: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  cardTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
  subtle: { color: colors.muted, fontFamily: typography.medium, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { backgroundColor: colors.line, borderRadius: 4, height: 24, width: 24 },
  levelOne: { backgroundColor: '#C9C5EC' },
  levelTwo: { backgroundColor: colors.lavender },
  levelThree: { backgroundColor: colors.lavenderDark },
  legend: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'flex-end' },
  weekRow: { flexDirection: 'row', gap: spacing.xs },
  weekCard: { alignItems: 'center', flex: 1, padding: spacing.sm },
  weekValue: { color: colors.ink, fontFamily: typography.display, fontSize: 28 },
  emptyTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
  history: { alignItems: 'center', flexDirection: 'row', padding: spacing.md },
  historyIcon: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  historyCopy: { flex: 1 },
  historyTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 15 },
});
