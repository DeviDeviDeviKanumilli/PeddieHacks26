import { router } from 'expo-router';
import { ArrowRight, Clock3, Dumbbell, RefreshCw, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { Body, Button, Card, Chip, Eyebrow, Screen, SectionHeading, Title } from '@/components/ui';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function WorkoutScreen() {
  const workout = useAppStore((state) => state.recommendedWorkout);
  const regenerate = useAppStore((state) => state.regenerateWorkout);
  return (
    <Screen>
      <AppHeader />
      <View style={styles.intro}>
        <Eyebrow>Build a session</Eyebrow>
        <Title compact>A workout that bends around your day.</Title>
        <Body muted>Start with your recommendation or adjust time, focus, and equipment.</Body>
      </View>
      <Card tone="lavender">
        <View style={styles.badge}>
          <Sparkles color={colors.lavenderDark} size={18} />
          <Text style={styles.badgeText}>Profile-based recommendation</Text>
        </View>
        <Text style={styles.name}>{workout.title}</Text>
        <Body muted>{workout.focus}</Body>
        <View style={styles.meta}>
          <Clock3 color={colors.ink} size={17} />
          <Text style={styles.metaText}>{workout.durationMinutes} minutes</Text>
          <Text style={styles.dot}>•</Text>
          <Dumbbell color={colors.ink} size={17} />
          <Text style={styles.metaText}>{workout.items.length} exercises</Text>
        </View>
        <Button icon={ArrowRight} onPress={() => router.push(`/workout/${workout.id}`)}>
          Review recommendation
        </Button>
      </Card>
      <SectionHeading title="Quick adjustments" />
      <Card>
        <Text style={styles.label}>Time available</Text>
        <View style={styles.chips}>
          <Chip label="10 min" onPress={() => {}} selected={false} />
          <Chip label="20 min" onPress={() => {}} selected />
          <Chip label="30 min" onPress={() => {}} selected={false} />
        </View>
        <Text style={styles.label}>Intensity</Text>
        <View style={styles.chips}>
          <Chip label="Gentle" onPress={() => {}} selected />
          <Chip label="Standard" onPress={() => {}} selected={false} />
          <Chip label="Challenging" onPress={() => {}} selected={false} />
        </View>
        <Button icon={RefreshCw} onPress={regenerate} variant="secondary">
          Refresh recommendation
        </Button>
      </Card>
      <Card>
        <Text style={styles.manualTitle}>Build it exercise by exercise</Text>
        <Body muted>
          Browse compatible movements, choose sets and reps, and review every caution before
          starting.
        </Body>
        <Button onPress={() => router.push('/(tabs)/explore')} variant="quiet">
          Browse exercises
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs, marginTop: spacing.md },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: { color: colors.lavenderDark, fontFamily: typography.semibold, fontSize: 12 },
  name: { color: colors.ink, fontFamily: typography.display, fontSize: 30, lineHeight: 34 },
  meta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metaText: { color: colors.ink, fontFamily: typography.medium, fontSize: 13 },
  dot: { color: colors.neutral },
  label: { color: colors.ink, fontFamily: typography.semibold, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  manualTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 18 },
});
