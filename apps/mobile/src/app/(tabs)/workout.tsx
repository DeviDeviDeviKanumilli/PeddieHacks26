import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { ArrowRight, Clock3, Dumbbell, RefreshCw, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { Body, Button, Card, Chip, Eyebrow, Screen, SectionHeading, Title } from '@/components/ui';
import { mobileApi } from '@/lib/api';
import { hasApiConfig } from '@/lib/config';
import { exerciseFromApi } from '@/lib/exercises';
import { movementProfileRequest, syncMovementProfile } from '@/lib/profileSync';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function WorkoutScreen() {
  const workout = useAppStore((state) => state.recommendedWorkout);
  const regenerate = useAppStore((state) => state.regenerateWorkout);
  const setWorkout = useAppStore((state) => state.setRecommendedWorkout);
  const mergeExercises = useAppStore((state) => state.mergeExercises);
  const mode = useAppStore((state) => state.mode);
  const profile = useAppStore((state) => state.profile);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [intensity, setIntensity] = useState<'low' | 'standard' | 'high'>('low');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (mode !== 'live' || !hasApiConfig) {
      regenerate();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await syncMovementProfile(profile);
      const mappedProfile = movementProfileRequest(profile, 1);
      const generated = await mobileApi.generateWorkout({
        clientRequestId: Crypto.randomUUID(),
        durationMinutes,
        equipmentIds: mappedProfile.equipmentIds,
        goalIds: mappedProfile.goalIds,
        intensityPreference: intensity,
      });
      const details = await Promise.all(
        generated.items.map((item) => mobileApi.getExercise(item.exerciseId)),
      );
      mergeExercises(details.map((detail) => exerciseFromApi(detail)));
      setWorkout({
        id: generated.workoutId,
        title: 'Your adaptive workout',
        durationMinutes: generated.requestedDurationMinutes,
        focus: profile.goals.join(' + ') || 'Whole-body movement',
        items: generated.items.map((item) => ({
          id: item.id,
          exerciseSlug: item.exerciseSlug,
          sets: item.sets,
          reps: item.reps ?? 1,
          restSeconds: item.restSeconds,
        })),
      });
      router.push(`/workout/${generated.workoutId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The workout could not be generated.');
    } finally {
      setLoading(false);
    }
  };
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
        <Button
          disabled={workout.items.length === 0}
          icon={ArrowRight}
          onPress={() => router.push(`/workout/${workout.id}`)}
        >
          {workout.items.length === 0 ? 'No matching exercises yet' : 'Review recommendation'}
        </Button>
      </Card>
      <SectionHeading title="Quick adjustments" />
      <Card>
        <Text style={styles.label}>Time available</Text>
        <View style={styles.chips}>
          {[10, 20, 30].map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes} min`}
              onPress={() => setDurationMinutes(minutes)}
              selected={durationMinutes === minutes}
            />
          ))}
        </View>
        <Text style={styles.label}>Intensity</Text>
        <View style={styles.chips}>
          <Chip label="Gentle" onPress={() => setIntensity('low')} selected={intensity === 'low'} />
          <Chip
            label="Standard"
            onPress={() => setIntensity('standard')}
            selected={intensity === 'standard'}
          />
          <Chip
            label="Challenging"
            onPress={() => setIntensity('high')}
            selected={intensity === 'high'}
          />
        </View>
        {error ? (
          <Card tone="warning">
            <Body>{error}</Body>
          </Card>
        ) : null}
        <Button
          icon={RefreshCw}
          loading={loading}
          onPress={() => void refresh()}
          variant="secondary"
        >
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
