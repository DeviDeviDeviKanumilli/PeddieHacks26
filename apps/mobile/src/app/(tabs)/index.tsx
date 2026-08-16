import { router } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { Button, Screen } from '@/components/ui';
import { estimatedWorkoutMinutes, planFitReasons, usesExtraEquipment } from '@/lib/guestWorkout';
import { historyInProgressRange } from '@/lib/progressRange';
import { useAppStore } from '@/state/useAppStore';
import { colors, spacing, typography } from '@/theme/tokens';

// local weekly target for the home progress chip. not a live-mode quota.
const WEEKLY_WORKOUT_GOAL = 5;

const timeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function HomeScreen() {
  const workout = useAppStore((state) => state.recommendedWorkout);
  const catalog = useAppStore((state) => state.catalog);
  const history = useAppStore((state) => state.history);
  const profile = useAppStore((state) => state.profile);
  const hasWorkout = workout.items.length > 0;
  // drop orphaned slugs if the catalog changed; don't crash the plan card.
  const planned = workout.items.flatMap((item) => {
    const exercise = catalog.find((candidate) => candidate.slug === item.exerciseSlug);
    return exercise
      ? [{ id: item.id, name: exercise.name, sets: item.sets, reps: item.reps, exercise }]
      : [];
  });
  const minutes = estimatedWorkoutMinutes(workout.items);
  const extraEquipment = usesExtraEquipment(planned.map((item) => item.exercise));
  const reasons = planFitReasons(
    profile,
    planned.map((item) => item.exercise),
  );
  const weekHistory = historyInProgressRange(history, '7d');
  const weekSessions = weekHistory.length;
  const weekMinutes = Math.round(
    weekHistory.reduce((total, item) => total + item.durationSeconds, 0) / 60,
  );
  const weekProgress = Math.min(1, weekSessions / WEEKLY_WORKOUT_GOAL);

  return (
    <Screen style={styles.screen}>
      <AppHeader />
      <View style={styles.welcome}>
        <Text style={styles.greeting}>{timeOfDayGreeting()},</Text>
        <Text accessibilityRole="header" style={styles.welcomeTitle}>
          Ready to move?
        </Text>
      </View>

      <View style={styles.plan}>
        <View style={styles.planHeader}>
          <Text style={styles.eyebrow}>Today’s plan</Text>
          {hasWorkout ? <Text style={styles.planDuration}>{minutes} min</Text> : null}
        </View>
        {hasWorkout ? <Text style={styles.adapted}>Adapted for you</Text> : null}
        {planned.length > 0 ? (
          planned.map((item, index) => (
            <View
              key={item.id}
              style={[styles.planRow, index < planned.length - 1 && styles.planRowBorder]}
            >
              <Text style={styles.planNumber}>{index + 1}</Text>
              <View style={styles.planCopy}>
                <Text style={styles.planName}>{item.name}</Text>
                <Text style={styles.planMeta}>
                  {item.sets} sets × {item.reps} reps
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No matching exercises yet. Update your movement profile.</Text>
        )}
        {hasWorkout && !extraEquipment ? (
          <Text style={styles.planFoot}>No extra equipment</Text>
        ) : null}
        <Button disabled={!hasWorkout} onPress={() => router.push(`/workout/${workout.id}`)}>
          {hasWorkout ? 'Start workout' : 'Build a workout first'}
        </Button>
        {/* start goes to review, not session/setup — people still get a chance to swap. */}
      </View>

      {reasons.length > 0 ? (
        <View style={styles.why}>
          <Text style={styles.eyebrow}>Why this plan?</Text>
          <Text style={styles.whyLead}>Built around your movement profile</Text>
          {reasons.map((reason) => (
            <View key={reason} style={styles.reasonRow}>
              <Check color={colors.ink} size={16} strokeWidth={2.2} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/(tabs)/profile')}
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          >
            {/* navigate (not push) so we switch tabs instead of stacking home on profile. */}
            <Text style={styles.link}>View movement profile</Text>
            <ChevronRight color={colors.muted} size={16} />
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityHint="Opens weekly progress"
        accessibilityLabel={`This week, ${weekSessions} of ${WEEKLY_WORKOUT_GOAL} workouts, ${weekMinutes} minutes active`}
        accessibilityRole="button"
        onPress={() => router.navigate('/(tabs)/progress')}
        style={({ pressed }) => [styles.week, pressed && styles.pressed]}
      >
        {/* navigate to the progress tab — don't push a second copy of home. */}
        <View style={styles.weekHeader}>
          <Text style={styles.eyebrow}>This week</Text>
          <View style={styles.linkRow}>
            <Text style={styles.link}>View progress</Text>
            <ChevronRight color={colors.muted} size={16} />
          </View>
        </View>
        <Text style={styles.weekCount}>
          {weekSessions} of {WEEKLY_WORKOUT_GOAL} workouts
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${weekProgress * 100}%` }]} />
        </View>
        <Text style={styles.weekMeta}>{weekMinutes} min active</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xs },
  welcome: { gap: 2 },
  greeting: { color: colors.muted, fontFamily: typography.medium, fontSize: 16 },
  welcomeTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 36,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  plan: { gap: spacing.sm },
  planHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  planDuration: { color: colors.muted, fontFamily: typography.medium, fontSize: 13 },
  adapted: { color: colors.muted, fontFamily: typography.body, fontSize: 13, marginBottom: 2 },
  planRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  planRowBorder: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  planNumber: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 15,
    minWidth: 18,
    paddingTop: 2,
  },
  planCopy: { flex: 1, gap: 2 },
  planName: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17, lineHeight: 22 },
  planMeta: { color: colors.muted, fontFamily: typography.body, fontSize: 13 },
  planFoot: { color: colors.muted, fontFamily: typography.body, fontSize: 13 },
  empty: { color: colors.muted, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
  why: { gap: spacing.xs },
  whyLead: { color: colors.ink, fontFamily: typography.semibold, fontSize: 16, marginBottom: 4 },
  reasonRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 28 },
  reasonText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 21,
  },
  linkRow: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  link: { color: colors.muted, fontFamily: typography.medium, fontSize: 13 },
  week: { gap: spacing.xs, paddingTop: spacing.xs },
  weekHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  weekCount: { color: colors.ink, fontFamily: typography.semibold, fontSize: 16 },
  track: {
    backgroundColor: colors.line,
    borderRadius: 99,
    height: 8,
    overflow: 'hidden',
  },
  fill: { backgroundColor: colors.lavenderDark, borderRadius: 99, height: 8 },
  weekMeta: { color: colors.muted, fontFamily: typography.body, fontSize: 13 },
  pressed: { opacity: 0.7 },
});
