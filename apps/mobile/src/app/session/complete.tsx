import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronRight, Repeat2, Sparkles } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Metric, Screen, Title } from '@/components/ui';
import { exercises } from '@/data/catalog';
import { useAppStore } from '@/state/useAppStore';
import { colors, spacing, typography } from '@/theme/tokens';

export default function CompleteScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const exercise = exercises.find((item) => item.slug === params.exercise);
  const completeWorkout = useAppStore((state) => state.completeWorkout);
  const saved = useRef(false);
  const sets = Number(params.set ?? params.sets ?? 1);
  const targetReps = Number(params.reps ?? exercise?.reps ?? 0) * sets;
  const completedReps = Number(params.completedReps ?? params.reps ?? exercise?.reps ?? 0) * sets;
  const elapsed = Math.max(Number(params.elapsed ?? 0), completedReps * 3);
  useEffect(() => {
    if (saved.current || !exercise) return;
    saved.current = true;
    completeWorkout({
      title: exercise.name,
      durationSeconds: elapsed,
      exercises: 1,
      reps: completedReps,
      averageScore: params.tracking === '1' ? 88 : null,
    });
  }, [completeWorkout, completedReps, elapsed, exercise, params.tracking]);
  if (!exercise) return null;
  const query = new URLSearchParams({
    ...params,
    completedReps: String(completedReps),
    targetReps: String(targetReps),
    elapsed: String(elapsed),
  }).toString();
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.check}>
          <Check color={colors.surface} size={42} />
        </View>
        <Eyebrow>Exercise complete</Eyebrow>
        <Title compact>You showed up for your movement.</Title>
        <Body muted>
          {exercise.name} is complete. The useful part is what the session tells you—not a perfect
          score.
        </Body>
      </View>
      <Card tone="lavender">
        <View style={styles.metrics}>
          <Metric label="Completed" value={`${completedReps}/${targetReps}`} />
          <Metric label="Sets" value={String(sets)} />
          <Metric label="Time" value={`${Math.round(elapsed / 60)}m`} />
        </View>
      </Card>
      {params.tracking === '1' ? (
        <Card tone="success">
          <View style={styles.insight}>
            <Sparkles color={colors.success} size={22} />
            <View style={styles.insightCopy}>
              <Text style={styles.insightTitle}>Movement stayed consistent</Text>
              <Body muted>
                Demo-derived values are clearly separated from real account metrics.
              </Body>
            </View>
          </View>
        </Card>
      ) : (
        <Card>
          <View style={styles.insight}>
            <Repeat2 color={colors.lavenderDark} size={22} />
            <View style={styles.insightCopy}>
              <Text style={styles.insightTitle}>Manual session saved</Text>
              <Body muted>
                Completion and time are available. Form measurements remain unavailable because
                tracking was off.
              </Body>
            </View>
          </View>
        </Card>
      )}
      <Button icon={ChevronRight} onPress={() => router.push(`/session/analysis?${query}`)}>
        View detailed analysis
      </Button>
      <Button onPress={() => router.replace('/(tabs)')} variant="quiet">
        Return home
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  check: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: 45,
    height: 88,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 88,
  },
  metrics: { flexDirection: 'row', gap: spacing.md },
  insight: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  insightCopy: { flex: 1, gap: 3 },
  insightTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
});
