import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronRight, Repeat2, Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Metric, Screen, Title } from '@/components/ui';
import { combineMuscleLoad } from '@/lib/anatomy';
import { compactSearchParams, nextWorkoutItem, parseNonNegativeInt } from '@/lib/sessionFlow';
import { completeLiveSession, finishLiveWorkout, type LiveSessionContext } from '@/lib/sessionSync';
import { usePoseSession } from '@/lib/tracking/poseSession';
import { poseRepToMetric, summarizePoseSession } from '@/lib/tracking/sessionMetrics';
import { useAppStore } from '@/state/useAppStore';
import { colors, spacing, typography } from '@/theme/tokens';

export default function CompleteScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const catalog = useAppStore((state) => state.catalog);
  const workout = useAppStore((state) => state.recommendedWorkout);
  const exercise = catalog.find((item) => item.slug === params.exercise);
  const completeWorkout = useAppStore((state) => state.completeWorkout);
  const mode = useAppStore((state) => state.mode);
  const saved = useRef(false);
  const syncStarted = useRef(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const poseReps = usePoseSession((state) => state.reps);
  const poseSummary = summarizePoseSession(poseReps);
  const nativeTracked = poseSummary.counted > 0;
  const sets = Number(params.set ?? params.sets ?? 1);
  const repsPerSet = Number(params.reps ?? exercise?.reps ?? 0);
  const targetReps = repsPerSet * Number(params.sets ?? sets);
  const completedReps = Number(params.completedTotal ?? repsPerSet * sets);
  const elapsed = Math.max(Number(params.elapsedTotal ?? 0), completedReps * 3);
  const itemIndex = parseNonNegativeInt(params.itemIndex);
  const inPlan = Boolean(params.workout);
  const next = inPlan ? nextWorkoutItem(workout, itemIndex) : undefined;
  const nextExercise = next
    ? catalog.find((item) => item.slug === next.item.exerciseSlug)
    : undefined;
  const accReps = parseNonNegativeInt(params.sessionReps) + completedReps;
  const accElapsed = parseNonNegativeInt(params.sessionElapsed) + elapsed;
  const accExercises = parseNonNegativeInt(params.sessionExercises) + 1;
  const plannedCount = inPlan ? workout.items.length : 1;
  const liveContext: LiveSessionContext | null =
    params.workoutSessionId && params.exerciseSessionId
      ? {
          workoutSessionId: params.workoutSessionId,
          workoutSessionVersion: Number(params.workoutSessionVersion),
          exerciseSessionId: params.exerciseSessionId,
          exerciseSessionVersion: Number(params.exerciseSessionVersion),
          remainingSessions: params.remainingSessions ?? '',
        }
      : null;
  const saveGuestSummary = useCallback(() => {
    if (saved.current || !exercise) return;
    saved.current = true;
    const completedItems = inPlan ? workout.items.slice(0, accExercises) : [];
    completeWorkout({
      title: inPlan ? workout.title : exercise.name,
      durationSeconds: accElapsed,
      exercises: accExercises,
      reps: accReps,
      averageScore: poseSummary.meanFormScore,
      muscleLoad: combineMuscleLoad(
        (completedItems.length > 0 ? completedItems : [{ exerciseSlug: exercise.slug }]).flatMap(
          (item) => {
            const match = catalog.find((candidate) => candidate.slug === item.exerciseSlug);
            return match ? [match.muscleActivations] : [];
          },
        ),
      ),
    });
  }, [
    accElapsed,
    accExercises,
    accReps,
    catalog,
    completeWorkout,
    exercise,
    inPlan,
    poseSummary.meanFormScore,
    workout.items,
    workout.title,
  ]);
  useEffect(() => {
    if (!exercise || next) return;
    saveGuestSummary();
  }, [exercise, next, saveGuestSummary]);
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
    void completeLiveSession({
      context,
      completedReps,
      repsPerSet,
      elapsedSeconds: elapsed,
      finishWorkout: !next,
      ...(poseReps.length > 0 ? { metrics: poseReps.map(poseRepToMetric) } : {}),
    })
      .then(() => setSyncState('synced'))
      .catch(() => setSyncState('error'));
  }, [completedReps, elapsed, mode, next, params, poseReps, repsPerSet]);
  if (!exercise) return null;
  const query = compactSearchParams({
    ...params,
    completedReps: String(completedReps),
    targetReps: String(targetReps),
    elapsed: String(elapsed),
  });
  const continueToNext = () => {
    if (!next) return;
    router.replace(
      `/session/setup?${compactSearchParams({
        workout: params.workout,
        exercise: next.item.exerciseSlug,
        itemIndex: String(next.index),
        sessionReps: String(accReps),
        sessionElapsed: String(accElapsed),
        sessionExercises: String(accExercises),
        tracking: params.tracking,
        workoutSessionId: params.workoutSessionId,
        workoutSessionVersion: params.workoutSessionVersion,
      })}`,
    );
  };
  const endWorkout = () => {
    saveGuestSummary();
    if (mode === 'live' && liveContext && next) {
      void finishLiveWorkout(liveContext);
    }
    router.replace('/(tabs)');
  };
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.check}>
          <Check color={colors.surface} size={42} />
        </View>
        <Eyebrow>
          {plannedCount > 1
            ? `Exercise ${itemIndex + 1} of ${plannedCount} complete`
            : 'Exercise complete'}
        </Eyebrow>
        <Title compact>You showed up for your movement.</Title>
        <Body muted>
          {nextExercise
            ? `${exercise.name} is complete. Next is ${nextExercise.name}.`
            : `${exercise.name} is complete. The useful part is what the session tells you—not a perfect score.`}
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
              : syncState === 'error'
                ? 'Saved on this device. Account sync can be retried later.'
                : nativeTracked
                  ? 'Counted reps, on-device range, and progress are synced.'
                  : 'Counted reps and progress are synced.'}
          </Body>
        </Card>
      ) : null}
      {nativeTracked ? (
        <Card tone="success">
          <View style={styles.insight}>
            <Sparkles color={colors.success} size={22} />
            <View style={styles.insightCopy}>
              <Text style={styles.insightTitle}>On-device measurements saved</Text>
              <Body muted>
                {poseSummary.meanRomDeg === null
                  ? 'Repetitions were counted on this device. Range was not confident enough to store.'
                  : `Average range was ${Math.round(poseSummary.meanRomDeg)}° with a ${Math.round(poseSummary.meanFormScore ?? 0)}% form score. Only derived measurements may sync.`}
              </Body>
            </View>
          </View>
        </Card>
      ) : params.tracking === '1' ? (
        <Card tone="success">
          <View style={styles.insight}>
            <Sparkles color={colors.success} size={22} />
            <View style={styles.insightCopy}>
              <Text style={styles.insightTitle}>Manual camera session</Text>
              <Body muted>
                Automatic analysis was unavailable for this movement, so only manually counted
                repetitions and time were saved.
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
      {next ? (
        <Button icon={ChevronRight} onPress={continueToNext}>
          Continue to {nextExercise?.name ?? 'next exercise'}
        </Button>
      ) : null}
      {next ? (
        <Button onPress={() => router.push(`/session/analysis?${query}`)} variant="secondary">
          View detailed analysis
        </Button>
      ) : (
        <Button icon={ChevronRight} onPress={() => router.push(`/session/analysis?${query}`)}>
          View detailed analysis
        </Button>
      )}
      <Button onPress={endWorkout} variant="quiet">
        {next ? 'End workout' : 'Return home'}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
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
