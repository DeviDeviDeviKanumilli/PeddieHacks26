import { router } from 'expo-router';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { AnatomyMap } from '@/components/AnatomyMap';
import { AppHeader } from '@/components/AppHeader';
import { Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { activationsFromLoad, combineMuscleLoad } from '@/lib/anatomy';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function WorkoutScreen() {
  const workout = useAppStore((state) => state.recommendedWorkout);
  const catalog = useAppStore((state) => state.catalog);
  const plannedExercises = workout.items.flatMap((item) => {
    const exercise = catalog.find((candidate) => candidate.slug === item.exerciseSlug);
    return exercise
      ? [{ id: item.id, name: exercise.name, muscleActivations: exercise.muscleActivations }]
      : [];
  });
  const muscleActivations = activationsFromLoad(
    combineMuscleLoad(plannedExercises.map((exercise) => exercise.muscleActivations)),
  );
  return (
    <Screen>
      <AppHeader />
      <View style={styles.intro}>
        <Eyebrow>Build a session</Eyebrow>
        <Title compact>A workout that bends around your day.</Title>
        <Body muted>Start with your recommendation, or browse compatible exercises.</Body>
      </View>
      <Card tone="lavender" style={styles.recommendation}>
        <View style={styles.badge}>
          <Sparkles color={colors.lavenderDark} size={16} />
          <Text style={styles.badgeText}>Profile-based recommendation</Text>
        </View>
        <Text style={styles.name}>{workout.title}</Text>
        {muscleActivations.length > 0 ? (
          <AnatomyMap
            activations={muscleActivations}
            compact
            showLegend={false}
            showMuscleLabels={false}
          />
        ) : null}
        <View style={styles.exercises}>
          {plannedExercises.map((exercise) => (
            <Text key={exercise.id} style={styles.exerciseName}>
              {exercise.name}
            </Text>
          ))}
        </View>
        <Button
          disabled={workout.items.length === 0}
          icon={ArrowRight}
          onPress={() => router.push(`/workout/${workout.id}`)}
          style={styles.reviewButton}
        >
          {workout.items.length === 0 ? 'No matching exercises yet' : 'Review recommendation'}
        </Button>
      </Card>
      <Card>
        <Text style={styles.manualTitle}>Build it exercise by exercise</Text>
        <Body muted>Browse compatible movements and add them to your session before starting.</Body>
        <Button onPress={() => router.push('/(tabs)/explore')} variant="quiet">
          Browse exercises
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs },
  recommendation: { gap: spacing.md, padding: spacing.lg },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badgeText: { color: colors.lavenderDark, fontFamily: typography.semibold, fontSize: 13 },
  name: { color: colors.ink, fontFamily: typography.display, fontSize: 32, lineHeight: 38 },
  exercises: { gap: spacing.xs },
  exerciseName: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 17,
    lineHeight: 24,
  },
  reviewButton: { borderRadius: radii.pill },
  manualTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 18 },
});
