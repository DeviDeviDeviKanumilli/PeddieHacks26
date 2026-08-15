import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Minus, Play, Plus, TimerReset } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Chip, Eyebrow, Screen, Title } from '@/components/ui';
import { hasApiConfig } from '@/lib/config';
import { type LiveSessionContext, startLiveSession } from '@/lib/sessionSync';
import { usePoseSession } from '@/lib/tracking/poseSession';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function SessionSetupScreen() {
  const params = useLocalSearchParams<{ exercise?: string; workout?: string }>();
  const workout = useAppStore((state) => state.recommendedWorkout);
  const catalog = useAppStore((state) => state.catalog);
  const exercise = useMemo(
    () =>
      catalog.find((item) => item.slug === (params.exercise ?? workout.items[0]?.exerciseSlug)) ??
      catalog[0],
    [catalog, params.exercise, workout.items],
  );
  const [sets, setSets] = useState(exercise?.sets ?? 2);
  const [reps, setReps] = useState(exercise?.reps ?? 8);
  const [rest, setRest] = useState(exercise?.restSeconds ?? 45);
  const [tracking, setTracking] = useState(Boolean(exercise?.trackingSupported));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mode = useAppStore((state) => state.mode);
  const clearPoseSession = usePoseSession((state) => state.clearPoseSession);
  const clientRequestId = useRef(Crypto.randomUUID()).current;
  if (!exercise) return null;
  const routeToSession = (context?: LiveSessionContext) => {
    const query = new URLSearchParams({
      exercise: exercise.slug,
      sets: String(sets),
      reps: String(reps),
      rest: String(rest),
      tracking: tracking ? '1' : '0',
      set: '1',
      ...(context
        ? {
            workoutSessionId: context.workoutSessionId,
            workoutSessionVersion: String(context.workoutSessionVersion),
            exerciseSessionId: context.exerciseSessionId,
            exerciseSessionVersion: String(context.exerciseSessionVersion),
            remainingSessions: context.remainingSessions,
          }
        : {}),
    }).toString();
    router.push(tracking ? `/session/permission?${query}` : `/session/active?${query}`);
  };
  const begin = async (localOnly = false) => {
    const canSync =
      !localOnly &&
      mode === 'live' &&
      hasApiConfig &&
      Boolean(params.workout?.match(/^[0-9a-f-]{36}$/iu));
    if (!canSync) {
      clearPoseSession();
      routeToSession();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      clearPoseSession();
      routeToSession(await startLiveSession(workout.id, exercise.id, clientRequestId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Session sync could not start.');
    } finally {
      setLoading(false);
    }
  };
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
        <Eyebrow>Exercise setup</Eyebrow>
        <Title compact>{exercise.name}</Title>
        <Body muted>
          Choose a comfortable target. You can pause, adjust rest, or stop at any time.
        </Body>
      </View>
      <Card>
        <Counter label="Sets" max={5} min={1} onChange={setSets} value={sets} />
        <View style={styles.divider} />
        <Counter label="Reps per set" max={50} min={1} onChange={setReps} value={reps} />
      </Card>
      <Card>
        <View style={styles.restHeader}>
          <TimerReset color={colors.lavenderDark} size={22} />
          <View style={styles.restCopy}>
            <Text style={styles.label}>Rest between sets</Text>
            <Text style={styles.hint}>Override the suggested {exercise.restSeconds} seconds.</Text>
          </View>
        </View>
        <View style={styles.chips}>
          {[30, 45, 60, 90].map((seconds) => (
            <Chip
              key={seconds}
              label={`${seconds}s`}
              onPress={() => setRest(seconds)}
              selected={rest === seconds}
            />
          ))}
        </View>
      </Card>
      <Card tone="lavender">
        <View style={styles.cameraHeader}>
          <Camera color={colors.lavenderDark} size={23} />
          <View style={styles.restCopy}>
            <Text style={styles.label}>Optional camera feedback</Text>
            <Text style={styles.hint}>
              {exercise.trackingSupported
                ? 'Preview and pose stay on this device. Live mode may sync derived counts and range only.'
                : 'Automated tracking is not available for this exercise.'}
            </Text>
          </View>
        </View>
        <View style={styles.chips}>
          <Chip label="Use camera" onPress={() => setTracking(true)} selected={tracking} />
          <Chip label="Continue without" onPress={() => setTracking(false)} selected={!tracking} />
        </View>
      </Card>
      {error ? (
        <Card tone="warning">
          <Body>{error}</Body>
        </Card>
      ) : null}
      <Button icon={Play} loading={loading} onPress={() => void begin()}>
        Continue to workout
      </Button>
      {error ? (
        <Button onPress={() => void begin(true)} variant="quiet">
          Continue on this device
        </Button>
      ) : null}
    </Screen>
  );
}

const Counter = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <View style={styles.counter}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.counterControls}>
      <Pressable
        accessibilityLabel={`Decrease ${label}`}
        accessibilityRole="button"
        onPress={() => onChange(Math.max(min, value - 1))}
        style={styles.counterButton}
      >
        <Minus color={colors.ink} size={20} />
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.counterValue}>
        {value}
      </Text>
      <Pressable
        accessibilityLabel={`Increase ${label}`}
        accessibilityRole="button"
        onPress={() => onChange(Math.min(max, value + 1))}
        style={styles.counterButton}
      >
        <Plus color={colors.ink} size={20} />
      </Pressable>
    </View>
  </View>
);

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
  counter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.ink, fontFamily: typography.semibold, fontSize: 16 },
  counterControls: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
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
    fontSize: 32,
    minWidth: 42,
    textAlign: 'center',
  },
  divider: { backgroundColor: colors.line, height: 1 },
  restHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  cameraHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  restCopy: { flex: 1, gap: 3 },
  hint: { color: colors.muted, fontFamily: typography.body, fontSize: 12, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
