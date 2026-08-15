import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronRight, Repeat2, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Metric, Screen, Title } from '@/components/ui';
import { completeLiveSession, type LiveSessionContext } from '@/lib/sessionSync';
import { useAppStore } from '@/state/useAppStore';
import { colors, spacing, typography } from '@/theme/tokens';

export default function CompleteScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const catalog = useAppStore((state) => state.catalog);
  const exercise = catalog.find((item) => item.slug === params.exercise);
  const completeWorkout = useAppStore((state) => state.completeWorkout);
  const mode = useAppStore((state) => state.mode);
  const saved = useRef(false);
  const syncStarted = useRef(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const sets = Number(params.set ?? params.sets ?? 1);
  const repsPerSet = Number(params.reps ?? exercise?.reps ?? 0);
  const targetReps = repsPerSet * Number(params.sets ?? sets);
  const completedReps = Number(params.completedTotal ?? repsPerSet * sets);
  const elapsed = Math.max(Number(params.elapsedTotal ?? 0), completedReps * 3);
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
  useEffect(() => {
    if (
      syncStarted.current ||
      mode !== 'live' ||
      !params.workoutSessionId ||
      !params.exerciseSessionId
    )
      return;
    syncStarted.current = true;
    setSyncState('syncing');
    const context: LiveSessionContext = {
      workoutSessionId: params.workoutSessionId,
      workoutSessionVersion: Number(params.workoutSessionVersion),
      exerciseSessionId: params.exerciseSessionId,
      exerciseSessionVersion: Number(params.exerciseSessionVersion),
      remainingSessions: params.remainingSessions ?? '',
    };
    void completeLiveSession({ context, completedReps, repsPerSet, elapsedSeconds: elapsed })
      .then(() => setSyncState('synced'))
      .catch(() => setSyncState('error'));
  }, [completedReps, elapsed, mode, params, repsPerSet]);
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
      {syncState !== 'idle' ? (
        <Card tone={syncState === 'error' ? 'warning' : 'success'}>
          <Body>
            {syncState === 'syncing'
              ? 'Syncing counted reps and completion…'
              : syncState === 'synced'
                ? 'Counted reps and progress are synced.'
                : 'Saved on this device. Account sync can be retried later.'}
          </Body>
        </Card>
      ) : null}
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
