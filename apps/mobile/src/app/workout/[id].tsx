import { router } from 'expo-router';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Play,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { exercises } from '@/data/catalog';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function WorkoutReviewScreen() {
  const workout = useAppStore((state) => state.recommendedWorkout);
  return (
    <Screen>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.back}
      >
        <ArrowLeft color={colors.ink} size={22} />
      </Pressable>
      <View style={styles.intro}>
        <Eyebrow>Recommended workout</Eyebrow>
        <Title compact>{workout.title}</Title>
        <Body muted>
          {workout.focus}. Review the order, adaptations, and rest before you begin.
        </Body>
      </View>
      <Card tone="success">
        <View style={styles.fit}>
          <ShieldCheck color={colors.success} size={22} />
          <Text style={styles.fitTitle}>Checked against your profile</Text>
        </View>
        <Body muted>
          Hard conflicts are excluded. You can still open any exercise to review its requirements.
        </Body>
      </Card>
      <View style={styles.timeline}>
        {workout.items.map((item, index) => {
          const exercise = exercises.find((candidate) => candidate.slug === item.exerciseSlug);
          if (!exercise) return null;
          return (
            <View key={item.id} style={styles.timelineRow}>
              <View style={styles.track}>
                <View style={styles.number}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                {index < workout.items.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <Card style={styles.exercise}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/exercise/${exercise.slug}`)}
                  style={styles.exerciseTop}
                >
                  <View style={styles.exerciseCopy}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.meta}>
                      {item.sets} sets × {item.reps} reps · {item.restSeconds}s rest
                    </Text>
                  </View>
                  <ChevronDown color={colors.muted} size={20} />
                </Pressable>
                <View style={styles.reason}>
                  <Check color={colors.success} size={15} />
                  <Text style={styles.reasonText}>{exercise.compatibilityReason}</Text>
                </View>
                <Button
                  onPress={() => router.push(`/(tabs)/explore?replace=${item.id}`)}
                  variant="quiet"
                  icon={RefreshCw}
                >
                  Swap exercise
                </Button>
              </Card>
            </View>
          );
        })}
      </View>
      <Card tone="lavender">
        <View style={styles.duration}>
          <Clock3 color={colors.lavenderDark} size={24} />
          <View>
            <Text style={styles.durationValue}>{workout.durationMinutes} minutes</Text>
            <Text style={styles.meta}>Includes planned rest between sets</Text>
          </View>
        </View>
      </Card>
      <Button icon={Play} onPress={() => router.push(`/session/setup?workout=${workout.id}`)}>
        Start workout
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  intro: { gap: spacing.xs },
  fit: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  fitTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
  timeline: { gap: 0 },
  timelineRow: { alignItems: 'stretch', flexDirection: 'row', gap: spacing.sm },
  track: { alignItems: 'center', width: 34 },
  number: {
    alignItems: 'center',
    backgroundColor: colors.lavenderDark,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  numberText: { color: colors.surface, fontFamily: typography.bold, fontSize: 13 },
  line: { backgroundColor: colors.line, flex: 1, minHeight: 18, width: 2 },
  exercise: { flex: 1, marginBottom: spacing.md, padding: spacing.md },
  exerciseTop: { alignItems: 'center', flexDirection: 'row' },
  exerciseCopy: { flex: 1 },
  exerciseName: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
  meta: { color: colors.muted, fontFamily: typography.body, fontSize: 12 },
  reason: {
    alignItems: 'flex-start',
    backgroundColor: colors.successSoft,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  reasonText: {
    color: colors.success,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  duration: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  durationValue: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
});
