import { router } from 'expo-router';
import { ArrowLeft, ChevronDown, Play, Plus, RefreshCw } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnatomyMap } from '@/components/AnatomyMap';
import { AccessiblePressable, Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { compactSearchParams } from '@/lib/sessionFlow';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function WorkoutReviewScreen() {
  const workout = useAppStore((state) => state.recommendedWorkout);
  const catalog = useAppStore((state) => state.catalog);
  return (
    <Screen>
      <AccessiblePressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={() => router.replace('/(tabs)/workout')}
        style={styles.back}
      >
        <ArrowLeft color={colors.ink} size={22} />
      </AccessiblePressable>
      <View style={styles.intro}>
        <Eyebrow>Recommended workout</Eyebrow>
        <Title compact>{workout.title}</Title>
        <Body muted>
          Review each exercise, swap anything that does not fit, or add another movement.
        </Body>
      </View>
      <View style={styles.timeline}>
        {workout.items.map((item, index) => {
          const exercise = catalog.find((candidate) => candidate.slug === item.exerciseSlug);
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
                  onPress={() => router.push(`/exercise/${exercise.slug}?from=workout`)}
                  style={styles.exerciseTop}
                >
                  <View style={styles.exerciseCopy}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                  </View>
                  <ChevronDown color={colors.muted} size={20} />
                </Pressable>
                {exercise.muscleActivations.length > 0 ? (
                  <AnatomyMap
                    activations={exercise.muscleActivations}
                    showCanvas={false}
                    showLegend={index === 0}
                  />
                ) : null}
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
      {workout.items.length === 0 ? (
        <Card tone="warning">
          <Body>
            No exercise matches every current constraint and equipment choice. Update your profile
            or browse the catalog to review options individually.
          </Body>
        </Card>
      ) : null}
      <Button icon={Plus} onPress={() => router.push('/(tabs)/explore?add=1')} variant="secondary">
        Add exercise
      </Button>
      <Button
        disabled={workout.items.length === 0}
        icon={Play}
        onPress={() => {
          const first = workout.items[0];
          if (!first) return;
          router.push(
            `/session/setup?${compactSearchParams({
              workout: workout.id,
              itemIndex: '0',
              exercise: first.exerciseSlug,
            })}`,
          );
        }}
      >
        {workout.items.length === 0 ? 'Adjust profile first' : 'Start workout'}
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
});
