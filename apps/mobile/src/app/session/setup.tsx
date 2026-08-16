import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  ArrowLeft,
  Camera,
  Dumbbell,
  Layers,
  Minus,
  Play,
  Plus,
  TimerReset,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { MovementMark } from '@/components/MovementMark';
import { AccessiblePressable, Body, Button, Card, Eyebrow, Screen } from '@/components/ui';
import { useAccessibility } from '@/lib/accessibility';
import { hasApiConfig } from '@/lib/config';
import { estimatedWorkoutMinutes } from '@/lib/guestWorkout';
import { compactSearchParams, parseNonNegativeInt } from '@/lib/sessionFlow';
import { type LiveSessionContext, resumeLiveExercise, startLiveSession } from '@/lib/sessionSync';
import { usePoseSession } from '@/lib/tracking/poseSession';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { Exercise, WorkoutItem } from '@/types';

const UUID = /^[0-9a-f-]{36}$/iu;
const REST_OPTIONS = [30, 45, 60, 90] as const;
const PEEK = 16;
const CARD_GAP = 10;

type SetupPage = {
  key: string;
  item?: WorkoutItem;
  exercise: Exercise;
};

export default function SessionSetupScreen() {
  const params = useLocalSearchParams<{
    exercise?: string;
    workout?: string;
    itemIndex?: string;
    sessionReps?: string;
    sessionElapsed?: string;
    sessionExercises?: string;
    workoutSessionId?: string;
    workoutSessionVersion?: string;
    tracking?: string;
  }>();
  const { width } = useWindowDimensions();
  const { reducedMotion } = useAccessibility();
  const workout = useAppStore((state) => state.recommendedWorkout);
  const catalog = useAppStore((state) => state.catalog);
  const updateWorkoutItem = useAppStore((state) => state.updateWorkoutItem);
  const mode = useAppStore((state) => state.mode);
  const itemIndex = parseNonNegativeInt(params.itemIndex);
  const fallbackExercise = catalog.find((item) => item.slug === params.exercise) ?? catalog[0];
  const pages = useMemo<SetupPage[]>(() => {
    if (params.workout) {
      return workout.items.slice(itemIndex).flatMap((item) => {
        const exercise = catalog.find((candidate) => candidate.slug === item.exerciseSlug);
        return exercise ? [{ key: item.id, item, exercise }] : [];
      });
    }
    return fallbackExercise ? [{ key: fallbackExercise.slug, exercise: fallbackExercise }] : [];
  }, [catalog, fallbackExercise, itemIndex, params.workout, workout.items]);
  const starting = pages[0];
  const [soloSets, setSoloSets] = useState(fallbackExercise?.sets ?? 2);
  const [soloReps, setSoloReps] = useState(fallbackExercise?.reps ?? 8);
  const [soloRest, setSoloRest] = useState(fallbackExercise?.restSeconds ?? 45);
  const [page, setPage] = useState(0);
  const [tracking, setTracking] = useState(
    params.tracking === '1' ||
      (params.tracking !== '0' && Boolean(starting?.exercise.trackingSupported)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<SetupPage>>(null);
  const clearPoseSession = usePoseSession((state) => state.clearPoseSession);
  const clientRequestId = useRef(Crypto.randomUUID()).current;
  const sidePad = spacing.lg;
  const cardWidth = Math.max(240, width - sidePad - PEEK - CARD_GAP);
  const pageWidth = cardWidth + CARD_GAP;
  const cameraAvailable = pages.some((entry) => entry.exercise.trackingSupported);
  const visible = pages[Math.min(page, Math.max(0, pages.length - 1))];
  if (!starting || !visible) return null;
  const goBack = () => {
    if (params.workout) {
      router.replace(`/workout/${params.workout}`);
      return;
    }
    router.replace('/(tabs)/workout');
  };
  const scrollToPage = (index: number) => {
    const next = Math.max(0, Math.min(pages.length - 1, index));
    listRef.current?.scrollToOffset({
      offset: next * pageWidth,
      animated: !reducedMotion,
    });
    setPage(next);
  };
  const onCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (index !== page && index >= 0 && index < pages.length) setPage(index);
  };
  const prescription = (entry: SetupPage) =>
    entry.item
      ? { sets: entry.item.sets, reps: entry.item.reps, rest: entry.item.restSeconds }
      : { sets: soloSets, reps: soloReps, rest: soloRest };
  const updatePage = (
    entry: SetupPage,
    patch: { sets?: number; reps?: number; restSeconds?: number },
  ) => {
    if (entry.item) {
      updateWorkoutItem(entry.item.id, patch);
      return;
    }
    if (patch.sets !== undefined) setSoloSets(patch.sets);
    if (patch.reps !== undefined) setSoloReps(patch.reps);
    if (patch.restSeconds !== undefined) setSoloRest(patch.restSeconds);
  };
  const routeToSession = (context?: LiveSessionContext) => {
    const values = prescription(starting);
    const useCamera = tracking && starting.exercise.trackingSupported;
    const query = compactSearchParams({
      exercise: starting.exercise.slug,
      sets: String(values.sets),
      reps: String(values.reps),
      rest: String(values.rest),
      tracking: useCamera ? '1' : '0',
      set: '1',
      itemIndex: String(itemIndex),
      workout: params.workout,
      sessionReps: params.sessionReps,
      sessionElapsed: params.sessionElapsed,
      sessionExercises: params.sessionExercises,
      ...(context
        ? {
            workoutSessionId: context.workoutSessionId,
            workoutSessionVersion: String(context.workoutSessionVersion),
            exerciseSessionId: context.exerciseSessionId,
            exerciseSessionVersion: String(context.exerciseSessionVersion),
            remainingSessions: context.remainingSessions,
          }
        : {}),
    });
    router.push(useCamera ? `/session/permission?${query}` : `/session/active?${query}`);
  };
  const begin = async (localOnly = false) => {
    const canSync =
      !localOnly &&
      mode === 'live' &&
      hasApiConfig &&
      (Boolean(params.workoutSessionId) || Boolean(params.workout?.match(UUID)));
    if (!canSync) {
      clearPoseSession();
      routeToSession();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      clearPoseSession();
      const context = params.workoutSessionId
        ? await resumeLiveExercise(
            params.workoutSessionId,
            Number(params.workoutSessionVersion),
            starting.exercise.id,
          )
        : await startLiveSession(workout.id, starting.exercise.id, clientRequestId);
      routeToSession(context);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Session sync could not start.');
    } finally {
      setLoading(false);
    }
  };
  const progress = pages.length === 0 ? 0 : (page + 1) / pages.length;
  const sessionMinutes = estimatedWorkoutMinutes(
    pages.map((entry) => {
      const values = prescription(entry);
      return { sets: values.sets, reps: values.reps, restSeconds: values.rest };
    }),
  );
  const followingNames = pages.slice(1).map((entry) => entry.exercise.name);
  return (
    <Screen padded={false} scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <AccessiblePressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={goBack}
            style={styles.back}
          >
            <ArrowLeft color={colors.ink} size={22} />
          </AccessiblePressable>
          <View style={styles.intro}>
            <Eyebrow>Workout setup</Eyebrow>
            <Text style={styles.screenTitle}>Review and adjust</Text>
          </View>
        </View>
        {pages.length > 1 ? (
          <View style={styles.progressRow}>
            <Text accessibilityLiveRegion="polite" style={styles.progressLabel}>
              {page + 1} of {pages.length}
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: pages.length, now: page + 1 }}
              style={styles.progressTrack}
            >
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.main}>
        <FlatList
          ref={listRef}
          contentContainerStyle={[
            styles.carouselContent,
            { paddingLeft: sidePad, paddingRight: PEEK },
          ]}
          data={pages}
          decelerationRate="fast"
          extraData={workout.items}
          getItemLayout={(_, index) => ({
            index,
            length: pageWidth,
            offset: pageWidth * index,
          })}
          horizontal
          disableIntervalMomentum
          keyExtractor={(entry) => entry.key}
          onMomentumScrollEnd={onCarouselScroll}
          renderItem={({ item }) => (
            <View style={[styles.carouselPage, { marginRight: CARD_GAP, width: cardWidth }]}>
              <ExerciseSetupCard
                exercise={item.exercise}
                onChange={(patch) => updatePage(item, patch)}
                values={prescription(item)}
              />
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          snapToInterval={pageWidth}
          snapToAlignment="start"
          style={styles.carousel}
        />
        {pages.length > 1 ? (
          <View style={styles.dots}>
            {pages.map((entry, index) => (
              <AccessiblePressable
                key={entry.key}
                accessibilityLabel={`Exercise ${index + 1} of ${pages.length}`}
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => scrollToPage(index)}
                style={[styles.dot, index === page && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}
        {cameraAvailable ? (
          <AccessiblePressable
            accessibilityLabel={`Form feedback ${tracking ? 'on' : 'off'}`}
            accessibilityRole="switch"
            accessibilityState={{ checked: tracking }}
            onPress={() => setTracking((value) => !value)}
            style={styles.cameraRow}
          >
            <Camera color={colors.lavenderDark} size={20} />
            <Text style={styles.cameraTitle}>Form feedback</Text>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.toggleTrack, tracking && styles.toggleTrackOn]}
            >
              <View style={[styles.toggleThumb, tracking && styles.toggleThumbOn]} />
            </View>
          </AccessiblePressable>
        ) : null}
      </View>
      <View style={styles.previewWrap}>
        <Card style={styles.previewCard} tone="lavender">
          <View style={styles.previewTop}>
            <Text style={styles.previewEyebrow}>
              {itemIndex > 0 ? 'Continue with' : 'You will start with'}
            </Text>
            <Text style={styles.previewTime}>~{sessionMinutes} min</Text>
          </View>
          <Text style={styles.previewName}>{starting.exercise.name}</Text>
          {starting.exercise.instructions[0] ? (
            <Text style={styles.previewCue}>{starting.exercise.instructions[0]}</Text>
          ) : null}
          {followingNames.length > 0 ? (
            <Text numberOfLines={2} style={styles.previewNext}>
              Then {followingNames.join(' · ')}
            </Text>
          ) : null}
        </Card>
      </View>
      <View style={styles.cta}>
        {error ? (
          <Card tone="warning">
            <Body>{error}</Body>
          </Card>
        ) : null}
        <Button icon={Play} loading={loading} onPress={() => void begin()}>
          {itemIndex > 0 ? 'Continue workout' : 'Start workout'}
        </Button>
        {error ? (
          <Button onPress={() => void begin(true)} variant="quiet">
            Continue on this device
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}

const ExerciseSetupCard = ({
  exercise,
  values,
  onChange,
}: {
  exercise: Exercise;
  values: { sets: number; reps: number; rest: number };
  onChange: (patch: { sets?: number; reps?: number; restSeconds?: number }) => void;
}) => (
  <Card style={styles.exerciseCard}>
    <View style={styles.exerciseHeader}>
      <MovementMark category={exercise.category} size={36} />
      <Text style={styles.exerciseName}>{exercise.name}</Text>
    </View>
    <Counter
      icon={Layers}
      label="Sets"
      max={5}
      min={1}
      onChange={(value) => onChange({ sets: value })}
      value={values.sets}
    />
    <Counter
      icon={Dumbbell}
      label="Reps"
      max={50}
      min={1}
      onChange={(value) => onChange({ reps: value })}
      value={values.reps}
    />
    <View style={styles.restBlock}>
      <View style={styles.restHeader}>
        <TimerReset color={colors.lavenderDark} size={18} />
        <Text style={styles.counterLabel}>Rest</Text>
      </View>
      <View style={styles.chips}>
        {REST_OPTIONS.map((seconds) => (
          <AccessiblePressable
            key={seconds}
            accessibilityLabel={`${seconds} seconds rest`}
            accessibilityRole="button"
            accessibilityState={{ selected: values.rest === seconds }}
            onPress={() => onChange({ restSeconds: seconds })}
            style={[styles.restChip, values.rest === seconds && styles.restChipSelected]}
          >
            <Text style={[styles.restChipText, values.rest === seconds && styles.restChipTextOn]}>
              {seconds}s
            </Text>
          </AccessiblePressable>
        ))}
      </View>
    </View>
  </Card>
);

const Counter = ({
  icon: Icon,
  label,
  value,
  min,
  max,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <View style={styles.counter}>
    <Icon color={colors.lavenderDark} size={18} />
    <Text style={styles.counterLabel}>{label}</Text>
    <View style={styles.counterControls}>
      <AccessiblePressable
        accessibilityLabel={`Decrease ${label}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={styles.counterButton}
      >
        <Minus color={colors.ink} size={20} />
      </AccessiblePressable>
      <Text accessibilityLiveRegion="polite" style={styles.counterValue}>
        {value}
      </Text>
      <AccessiblePressable
        accessibilityLabel={`Increase ${label}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={styles.counterButton}
      >
        <Plus color={colors.ink} size={20} />
      </AccessiblePressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, gap: spacing.md, minHeight: 0, paddingTop: spacing.xs },
  header: { flexShrink: 0, gap: spacing.sm, paddingHorizontal: spacing.lg },
  topRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
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
  intro: { flex: 1, gap: 2 },
  screenTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 28,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  progressRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  progressLabel: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
    minWidth: 48,
  },
  progressTrack: {
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: colors.lavenderDark, borderRadius: radii.pill, height: 6 },
  main: { flexShrink: 0, gap: spacing.sm, paddingTop: spacing.xs },
  carousel: { flexGrow: 0 },
  carouselContent: { alignItems: 'flex-start' },
  carouselPage: { flexGrow: 0 },
  exerciseCard: { gap: spacing.sm, padding: spacing.md },
  exerciseHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  exerciseName: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.display,
    fontSize: 22,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  dots: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 20,
  },
  dot: {
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  dotActive: { backgroundColor: colors.lavenderDark, width: 16 },
  cameraRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    minHeight: 52,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  cameraTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  toggleTrack: {
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 2,
    width: 48,
  },
  toggleTrackOn: { backgroundColor: colors.lavender },
  toggleThumb: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 24,
    width: 24,
    ...Platform.select({ android: { elevation: 1 }, default: {} }),
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  previewWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
    paddingHorizontal: spacing.lg,
  },
  previewCard: { gap: spacing.xs, padding: spacing.md },
  previewTop: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
  previewEyebrow: {
    color: colors.lavenderDark,
    flex: 1,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  previewTime: { color: colors.muted, fontFamily: typography.semibold, fontSize: 13 },
  previewName: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 22,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  previewCue: { color: colors.ink, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
  previewNext: { color: colors.muted, fontFamily: typography.medium, fontSize: 13, lineHeight: 18 },
  cta: { flexShrink: 0, gap: spacing.sm, paddingHorizontal: spacing.lg },
  counter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
  },
  counterLabel: {
    color: colors.ink,
    flex: 1,
    flexShrink: 1,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  counterControls: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing.xs,
  },
  counterButton: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  counterValue: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 22,
    lineHeight: 26,
    minWidth: 32,
    textAlign: 'center',
  },
  restBlock: { gap: spacing.xs, paddingTop: spacing.xxs },
  restHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.xs },
  restChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  restChipSelected: {
    backgroundColor: colors.lavenderDark,
    borderColor: colors.lavenderDark,
  },
  restChipText: { color: colors.ink, fontFamily: typography.medium, fontSize: 13 },
  restChipTextOn: { color: colors.surface },
});
