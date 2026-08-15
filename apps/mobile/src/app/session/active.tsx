import { CameraView } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { CircleStop, Pause, Play, Plus, VideoOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnatomyMap } from '@/components/AnatomyMap';
import { Button, Card, Screen } from '@/components/ui';
import { useAppIsActive } from '@/hooks/useAppIsActive';
import { isPoseTrackingAvailable, type PoseAnglesEvent, SessionCamera } from '@/lib/poseCamera';
import { MoveState, RangeOfMotionTracker } from '@/lib/tracking/analyzer';
import { usePoseSession } from '@/lib/tracking/poseSession';
import { createSetTracker, getCalibratedRecipe, getTrackingRecipe } from '@/lib/tracking/recipes';
import {
  combinedRangeOfMotion,
  feedbackForRep,
  finiteJointAngle,
  type PoseRepRecord,
} from '@/lib/tracking/sessionMetrics';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const feedback = [
  'Keep the movement smooth',
  'Nice control—keep breathing',
  'Use the range that feels comfortable',
];

export default function ActiveSessionScreen() {
  const params = useLocalSearchParams<{
    exercise: string;
    sets: string;
    reps: string;
    rest: string;
    tracking: string;
    set: string;
    elapsedTotal?: string;
    completedTotal?: string;
    workoutSessionId?: string;
    workoutSessionVersion?: string;
    exerciseSessionId?: string;
    exerciseSessionVersion?: string;
    remainingSessions?: string;
  }>();
  const mode = useAppStore((state) => state.mode);
  const spokenFeedback = useAppStore((state) =>
    state.profile.accessibility.includes('Spoken feedback'),
  );
  const appIsActive = useAppIsActive();
  const catalog = useAppStore((state) => state.catalog);
  const exercise = catalog.find((item) => item.slug === params.exercise) ?? catalog[0];
  const targetReps = Number(params.reps ?? exercise?.reps ?? 8);
  const totalSets = Number(params.sets ?? exercise?.sets ?? 2);
  const currentSet = Number(params.set ?? 1);
  const priorElapsed = Number(params.elapsedTotal ?? 0);
  const priorCompleted = Number(params.completedTotal ?? 0);
  const [reps, setReps] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const tracking = params.tracking === '1';
  const recipe = getTrackingRecipe(exercise?.slug ?? '');
  const calibratedRecipe = getCalibratedRecipe(exercise?.slug ?? '');
  const nativePose = tracking && isPoseTrackingAvailable();
  const nativeCounting = nativePose && calibratedRecipe !== undefined;
  const demoTracking = tracking && mode === 'guest' && !nativeCounting;
  const recordPoseRep = usePoseSession((state) => state.recordPoseRep);
  const beginPoseSession = usePoseSession((state) => state.beginPoseSession);
  const trackerRef = useRef(
    calibratedRecipe ? createSetTracker(calibratedRecipe, targetReps) : null,
  );
  const romRef = useRef({
    left: new RangeOfMotionTracker(),
    right: new RangeOfMotionTracker(),
  });
  const confidenceRef = useRef<number[]>([]);
  const repStartedAt = useRef(Date.now());
  const setStartedAt = useRef(Date.now());
  const [poseCue, setPoseCue] = useState('Keep the movement smooth');
  useEffect(() => {
    if (currentSet === 1) beginPoseSession();
    trackerRef.current = calibratedRecipe ? createSetTracker(calibratedRecipe, targetReps) : null;
    romRef.current = { left: new RangeOfMotionTracker(), right: new RangeOfMotionTracker() };
    confidenceRef.current = [];
    repStartedAt.current = Date.now();
    setStartedAt.current = Date.now();
    setReps(0);
  }, [beginPoseSession, calibratedRecipe, currentSet, targetReps]);
  const recordNativeRep = useCallback(
    (
      partial: Omit<PoseRepRecord, 'setNumber' | 'repNumber' | 'recordedOffsetMs'> & {
        repNumber: number;
      },
    ) => {
      recordPoseRep({
        ...partial,
        setNumber: currentSet,
        recordedOffsetMs: Math.min(
          86_400_000,
          Math.round(priorElapsed * 1000 + (Date.now() - setStartedAt.current)),
        ),
      });
    },
    [currentSet, priorElapsed, recordPoseRep],
  );
  const snapshotCurrentRep = useCallback(
    (repNumber: number, targetPositionReached: boolean) => {
      const meanConfidence =
        confidenceRef.current.length === 0
          ? null
          : confidenceRef.current.reduce((sum, value) => sum + value, 0) /
            confidenceRef.current.length;
      const durationMs = Math.max(0, Date.now() - repStartedAt.current);
      recordNativeRep({
        repNumber,
        counted: true,
        durationMs,
        rangeOfMotionDeg: combinedRangeOfMotion(
          romRef.current.left.getStats()?.rangeOfMotionDegrees ?? null,
          romRef.current.right.getStats()?.rangeOfMotionDegrees ?? null,
        ),
        trackingConfidence:
          meanConfidence === null ? null : Math.min(1, Math.max(0, meanConfidence)),
        targetPositionReached,
        feedbackCodes: feedbackForRep({ confidence: meanConfidence, durationMs }),
      });
      romRef.current = { left: new RangeOfMotionTracker(), right: new RangeOfMotionTracker() };
      confidenceRef.current = [];
      repStartedAt.current = Date.now();
    },
    [recordNativeRep],
  );
  const onAngles = useCallback(
    (event: PoseAnglesEvent) => {
      if (!nativePose || paused) return;
      const { leftAngle, rightAngle, confidence } = event.nativeEvent;
      const left = finiteJointAngle(leftAngle);
      const right = finiteJointAngle(rightAngle);
      if (confidence > 0) confidenceRef.current.push(confidence);
      romRef.current.left.addAngle(left);
      romRef.current.right.addAngle(right);
      const tracker = trackerRef.current;
      if (!nativeCounting || tracker === null) return;
      const completed = tracker.update({ left, right }, Date.now() / 1000);
      setPoseCue(
        tracker.moveState === MoveState.TARGET_REACHED
          ? 'Target reached—return with control'
          : 'Keep the movement smooth',
      );
      if (!completed) return;
      snapshotCurrentRep(tracker.repsInSet, true);
      setReps(tracker.repsInSet);
    },
    [nativeCounting, nativePose, paused, snapshotCurrentRep],
  );
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [paused]);
  useEffect(() => {
    if (!demoTracking || paused) return;
    const timer = setInterval(() => setReps((value) => Math.min(targetReps, value + 1)), 2800);
    return () => clearInterval(timer);
  }, [demoTracking, paused, targetReps]);
  useEffect(() => {
    if (reps < targetReps) return;
    const query = new URLSearchParams({
      ...params,
      elapsedTotal: String(priorElapsed + elapsed),
      completedTotal: String(priorCompleted + reps),
    }).toString();
    const timer = setTimeout(() => {
      if (currentSet < totalSets) router.replace(`/session/rest?${query}`);
      else router.replace(`/session/complete?${query}`);
    }, 600);
    return () => clearTimeout(timer);
  }, [currentSet, elapsed, params, priorCompleted, priorElapsed, reps, targetReps, totalSets]);
  const feedbackText = useMemo(() => {
    if (nativeCounting) return poseCue;
    return feedback[Math.floor(reps / 2) % feedback.length] ?? feedback[0];
  }, [nativeCounting, poseCue, reps]);
  useEffect(() => {
    if (!tracking || !spokenFeedback || paused || !appIsActive || !feedbackText) return;
    Speech.stop();
    Speech.speak(feedbackText, { rate: 0.92 });
    return () => {
      Speech.stop();
    };
  }, [appIsActive, feedbackText, paused, spokenFeedback, tracking]);
  if (!exercise) return null;
  const countRep = () => {
    setReps((value) => {
      const next = Math.min(targetReps, value + 1);
      if (nativePose && next > value) {
        snapshotCurrentRep(next, false);
      }
      return next;
    });
  };
  const end = () =>
    router.replace(
      `/session/complete?${new URLSearchParams({
        ...params,
        elapsedTotal: String(priorElapsed + elapsed),
        completedTotal: String(priorCompleted + reps),
      }).toString()}`,
    );
  return (
    <Screen padded={false} scroll={false} style={styles.screen}>
      <View style={styles.top}>
        <View>
          <Text style={styles.exercise}>{exercise.name}</Text>
          <Text style={styles.set}>
            Set {currentSet} of {totalSets}
          </Text>
        </View>
        <Text style={styles.timer}>
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.stage}>
        {tracking && appIsActive && !paused ? (
          nativePose ? (
            <SessionCamera active onAngles={onAngles} recipe={recipe} />
          ) : (
            <CameraView facing="front" mirror style={StyleSheet.absoluteFill} />
          )
        ) : (
          <View style={styles.noCamera}>
            <View style={styles.noCameraMap}>
              <AnatomyMap
                activations={exercise.muscleActivations}
                compact
                showLegend={false}
                showMuscleLabels={false}
              />
            </View>
          </View>
        )}
        {!tracking ? (
          <View
            accessible
            accessibilityLabel="Camera tracking is off. Repetitions are counted manually."
            style={styles.trackingBadge}
          >
            <VideoOff color={colors.warning} size={16} strokeWidth={2.25} />
            <Text style={styles.trackingBadgeText}>Tracking off</Text>
          </View>
        ) : null}
        {nativePose ? (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>
              {nativeCounting ? 'On-device tracking' : 'On-device camera'}
            </Text>
          </View>
        ) : demoTracking ? (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>Simulated guest tracking</Text>
          </View>
        ) : null}
        <View style={styles.repWrap}>
          <Text accessibilityLiveRegion="polite" style={styles.rep}>
            {reps}
          </Text>
          <Text style={styles.repTarget}>of {targetReps} reps</Text>
          {!tracking ? (
            <Text style={styles.manualHint}>Tap Count rep after each repetition</Text>
          ) : null}
        </View>
        {tracking ? (
          <View style={styles.feedback}>
            <View style={styles.feedbackDot} />
            <Text style={styles.feedbackText}>{feedbackText}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={paused ? 'Resume exercise' : 'Pause exercise'}
          accessibilityRole="button"
          onPress={() => setPaused((value) => !value)}
          style={styles.circle}
        >
          {paused ? <Play color={colors.ink} size={24} /> : <Pause color={colors.ink} size={24} />}
        </Pressable>
        <Pressable
          accessibilityLabel="Count one repetition"
          accessibilityRole="button"
          onPress={countRep}
          style={styles.count}
        >
          <Plus color={colors.surface} size={28} />
          <Text style={styles.countText}>Count rep</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="End exercise"
          accessibilityRole="button"
          onPress={end}
          style={styles.circle}
        >
          <CircleStop color={colors.danger} size={24} />
        </Pressable>
      </View>
      {paused ? (
        <View style={styles.pauseOverlay}>
          <Card style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>Workout paused</Text>
            <Text style={styles.pauseBody}>
              Take your time. The camera and timer will resume when you are ready.
            </Text>
            <Button icon={Play} onPress={() => setPaused(false)}>
              Resume
            </Button>
            <Button onPress={end} variant="danger">
              End exercise
            </Button>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.black },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  exercise: { color: colors.surface, fontFamily: typography.semibold, fontSize: 17 },
  set: { color: colors.neutral, fontFamily: typography.medium, fontSize: 12 },
  timer: {
    color: colors.surface,
    fontFamily: typography.bold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  stage: { flex: 1, overflow: 'hidden' },
  noCamera: {
    alignItems: 'center',
    backgroundColor: '#1D1D29',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  noCameraMap: { maxWidth: 360, opacity: 0.9, width: '92%' },
  trackingBadge: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    zIndex: 2,
  },
  trackingBadgeText: { color: colors.warning, fontFamily: typography.semibold, fontSize: 12 },
  demoBadge: {
    backgroundColor: 'rgba(20,20,30,0.78)',
    borderRadius: radii.pill,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'absolute',
    top: spacing.md,
  },
  demoText: { color: colors.surface, fontFamily: typography.semibold, fontSize: 11 },
  repWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,30,0.72)',
    borderRadius: radii.lg,
    left: spacing.xl,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.xl,
    top: '38%',
  },
  rep: { color: colors.surface, fontFamily: typography.display, fontSize: 82, lineHeight: 84 },
  repTarget: { color: colors.lavenderSoft, fontFamily: typography.semibold, fontSize: 15 },
  manualHint: {
    color: colors.neutral,
    fontFamily: typography.medium,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  feedback: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    left: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
  },
  feedbackDot: { backgroundColor: colors.success, borderRadius: 99, height: 10, width: 10 },
  feedbackText: { color: colors.ink, flex: 1, fontFamily: typography.semibold, fontSize: 14 },
  controls: {
    alignItems: 'center',
    backgroundColor: colors.black,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.md,
  },
  circle: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  count: {
    alignItems: 'center',
    backgroundColor: colors.lavenderDark,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  countText: { color: colors.surface, fontFamily: typography.semibold, fontSize: 15 },
  pauseOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(17,18,26,0.78)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  pauseCard: { maxWidth: 420, width: '100%' },
  pauseTitle: { color: colors.ink, fontFamily: typography.display, fontSize: 30 },
  pauseBody: { color: colors.muted, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
});
