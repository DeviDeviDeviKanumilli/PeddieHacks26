import { router } from 'expo-router';
import { ArrowRight, CalendarDays, Clock3, Repeat2, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import {
  Body,
  Button,
  Card,
  Eyebrow,
  Metric,
  Screen,
  SectionHeading,
  Title,
} from '@/components/ui';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  const workout = useAppStore((state) => state.recommendedWorkout);
  const catalog = useAppStore((state) => state.catalog);
  const history = useAppStore((state) => state.history);
  const totalSeconds = history.reduce((sum, item) => sum + item.durationSeconds, 0);
  const totalReps = history.reduce((sum, item) => sum + item.reps, 0);
  const first = catalog.find((exercise) => exercise.slug === workout.items[0]?.exerciseSlug);
  return (
    <Screen>
      <AppHeader />
      <View style={styles.hero}>
        <Eyebrow>Good to see you</Eyebrow>
        <Title compact>What feels possible today?</Title>
        <Body muted>Your recommendations respond to the movement profile you saved.</Body>
      </View>
      <Card tone="lavender" style={styles.featured}>
        <View style={styles.featuredTop}>
          <View style={styles.spark}>
            <Sparkles color={colors.lavenderDark} size={22} />
          </View>
          <Text style={styles.recommended}>Recommended for you</Text>
        </View>
        <Text style={styles.workoutTitle}>{workout.title}</Text>
        <Body muted>
          {workout.focus}. {workout.items.length} exercises designed around your current profile.
        </Body>
        <View style={styles.pills}>
          <View style={styles.pill}>
            <Clock3 color={colors.ink} size={14} />
            <Text style={styles.pillText}>{workout.durationMinutes} min</Text>
          </View>
          <View style={styles.pill}>
            <Repeat2 color={colors.ink} size={14} />
            <Text style={styles.pillText}>{workout.items.length} movements</Text>
          </View>
        </View>
        <Button
          disabled={workout.items.length === 0}
          icon={ArrowRight}
          onPress={() => router.push(`/workout/${workout.id}`)}
        >
          {workout.items.length === 0 ? 'Adjust your movement profile' : 'Review workout'}
        </Button>
      </Card>
      <SectionHeading title="Your momentum" />
      <Card>
        <View style={styles.metrics}>
          <Metric label="Total time" value={`${Math.round(totalSeconds / 60)}m`} />
          <Metric label="Workouts" value={String(history.length)} />
          <Metric label="Lifetime reps" value={String(totalReps)} />
        </View>
      </Card>
      <SectionHeading title="A movement to try" />
      {first ? (
        <Card>
          <View style={styles.tryRow}>
            <View style={styles.tryIcon}>
              <CalendarDays color={colors.success} size={22} />
            </View>
            <View style={styles.tryCopy}>
              <Text style={styles.tryTitle}>{first.name}</Text>
              <Text style={styles.tryBody}>{first.summary}</Text>
            </View>
          </View>
          <Button onPress={() => router.push(`/exercise/${first.slug}`)} variant="secondary">
            View exercise
          </Button>
        </Card>
      ) : null}
      <Card tone="success">
        <Text style={styles.tipTitle}>Today’s small win</Text>
        <Body muted>
          A shorter workout that respects your limits still counts. Consistency is built from
          repeatable choices.
        </Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.md },
  featured: { overflow: 'hidden' },
  featuredTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  spark: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  recommended: {
    color: colors.lavenderDark,
    fontFamily: typography.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  workoutTitle: { color: colors.ink, fontFamily: typography.display, fontSize: 30, lineHeight: 34 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: { color: colors.ink, fontFamily: typography.medium, fontSize: 12 },
  metrics: { flexDirection: 'row', gap: spacing.md },
  tryRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  tryIcon: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  tryCopy: { flex: 1, gap: 3 },
  tryTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
  tryBody: { color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 18 },
  tipTitle: { color: colors.success, fontFamily: typography.semibold, fontSize: 16 },
});
