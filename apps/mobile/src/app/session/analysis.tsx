import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  Gauge,
  Move,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnatomyMap } from '@/components/AnatomyMap';
import {
  Body,
  Button,
  Card,
  Eyebrow,
  Metric,
  Screen,
  SectionHeading,
  Title,
} from '@/components/ui';
import { mobileApi } from '@/lib/api';
import { hasApiConfig } from '@/lib/config';
import { usePoseSession } from '@/lib/tracking/poseSession';
import { getTrackingRecipe } from '@/lib/tracking/recipes';
import { summarizePoseSession } from '@/lib/tracking/sessionMetrics';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function AnalysisScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const catalog = useAppStore((state) => state.catalog);
  const mode = useAppStore((state) => state.mode);
  const exercise = catalog.find((item) => item.slug === params.exercise);
  const tracked = params.tracking === '1';
  const poseReps = usePoseSession((state) => state.reps);
  const poseSummary = summarizePoseSession(poseReps);
  const nativeTracked = poseSummary.counted > 0;
  const recipe = getTrackingRecipe(exercise?.slug ?? '');
  const feedbackCodes = new Set(poseReps.flatMap((rep) => rep.feedbackCodes));
  const nextSessionCue = feedbackCodes.has('low_tracking_confidence')
    ? 'Place the phone farther away so your working joints remain visible.'
    : feedbackCodes.has('stability_left') || feedbackCodes.has('stability_right')
      ? (recipe?.formCue ?? 'Keep your supporting joints steady through each repetition.')
      : feedbackCodes.has('movement_jerky')
        ? 'Slow the direction changes and keep the movement continuous.'
        : feedbackCodes.has('range_of_motion_short') || feedbackCodes.has('target_position_missed')
          ? 'Use a slightly fuller comfortable range on the next set.'
          : feedbackCodes.has('tempo_too_slow')
            ? 'Keep a steady pace and avoid long pauses within a repetition.'
            : nativeTracked
              ? 'Your tracked repetitions stayed within the current movement targets.'
              : null;
  const completed = Number(params.completedReps ?? 0);
  const target = Number(params.targetReps ?? 0);
  const elapsed = Number(params.elapsed ?? 0);
  const liveAnalysis = useQuery({
    queryKey: ['exercise-analysis', params.exerciseSessionId],
    queryFn: () => mobileApi.getExerciseAnalysis(params.exerciseSessionId ?? ''),
    enabled: mode === 'live' && hasApiConfig && Boolean(params.exerciseSessionId),
    retry: 3,
    retryDelay: 600,
  });
  const analysis = liveAnalysis.data;
  const completion =
    analysis?.completion.percentage ?? (target > 0 ? Math.round((completed / target) * 100) : null);
  const tempo = analysis?.tempo.meanSeconds ?? (completed > 0 ? elapsed / completed : null);
  return (
    <Screen>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={() => router.replace('/(tabs)/workout')}
        style={styles.back}
      >
        <ArrowLeft color={colors.ink} size={22} />
      </Pressable>
      <View style={styles.intro}>
        <Eyebrow>Detailed analysis</Eyebrow>
        <Title compact>{exercise?.name ?? 'Exercise'} results</Title>
        <Body muted>
          Measurements are shown individually so you can see what changed. They are general-wellness
          indicators, not a medical assessment.
        </Body>
      </View>
      <Card tone="lavender">
        <View style={styles.metrics}>
          <Metric
            label="Completion"
            value={completion === null ? '—' : `${Math.round(completion)}%`}
          />
          <Metric label="Tempo" value={tempo === null ? '—' : `${tempo.toFixed(1)}s`} />
          <Metric label="Sets" value={params.set ?? '1'} />
        </View>
      </Card>
      {exercise ? (
        <>
          <SectionHeading title="Muscles worked" />
          <AnatomyMap activations={exercise.muscleActivations} compact />
        </>
      ) : null}
      <SectionHeading title="Movement measurements" />
      <View style={styles.grid}>
        <AnalysisCard
          icon={Move}
          label="Range of motion"
          value={
            analysis?.rangeOfMotion.averageDeg !== null &&
            analysis?.rangeOfMotion.averageDeg !== undefined
              ? `${Math.round(analysis.rangeOfMotion.averageDeg)}° avg`
              : poseSummary.meanRomDeg !== null
                ? `${Math.round(poseSummary.meanRomDeg)}° avg`
                : nativeTracked
                  ? 'Counted only'
                  : 'Not measured'
          }
          detail={
            poseSummary.meanRomDeg !== null
              ? `On-device range ${poseSummary.minRomDeg}°–${poseSummary.maxRomDeg}°. Not a clinical measurement.`
              : nativeTracked
                ? 'Repetitions were counted on-device without a confident range sample.'
                : tracked
                  ? 'Manual camera sessions do not infer range of motion.'
                  : 'Turn on supported tracking to measure range.'
          }
        />
        <AnalysisCard
          icon={ShieldCheck}
          label="Movement accuracy"
          value={
            analysis?.movementAccuracy !== null && analysis?.movementAccuracy !== undefined
              ? `${Math.round(analysis.movementAccuracy)}%`
              : poseSummary.meanAccuracyScore !== null
                ? `${Math.round(poseSummary.meanAccuracyScore)}%`
                : 'Not measured'
          }
          detail="How consistently completed repetitions reached the exercise-specific movement target."
        />
        <AnalysisCard
          icon={Gauge}
          label="Control"
          value={
            analysis?.movementControl !== null && analysis?.movementControl !== undefined
              ? `${Math.round(analysis.movementControl)}%`
              : poseSummary.meanControlScore !== null
                ? `${Math.round(poseSummary.meanControlScore)}%`
                : 'Not measured'
          }
          detail={
            analysis?.movementControl !== null && analysis?.movementControl !== undefined
              ? 'From derived control scores in this session.'
              : poseSummary.meanControlScore !== null
                ? 'Estimated from changes in joint speed within each repetition.'
                : 'No control score is inferred from manual counts or guest simulation.'
          }
        />
        <AnalysisCard
          icon={Activity}
          label="Stability"
          value={
            analysis?.stability !== null && analysis?.stability !== undefined
              ? `${Math.round(analysis.stability)}%`
              : poseSummary.meanStabilityScore !== null
                ? `${Math.round(poseSummary.meanStabilityScore)}%`
                : 'Not measured'
          }
          detail={
            analysis?.stability !== null && analysis?.stability !== undefined
              ? 'From derived stability scores in this session.'
              : poseSummary.meanStabilityScore !== null
                ? `Estimated from exercise-specific posture checks. ${recipe?.formCue ?? ''}`.trim()
                : 'Camera landmarks never leave the device, and stability is not inferred without tracked samples.'
          }
        />
        <AnalysisCard
          icon={Sparkles}
          label="Overall form"
          value={
            analysis?.overallScore !== null && analysis?.overallScore !== undefined
              ? `${Math.round(analysis.overallScore)}%`
              : poseSummary.meanFormScore !== null
                ? `${Math.round(poseSummary.meanFormScore)}%`
                : 'Not measured'
          }
          detail="A weighted summary of range, movement control, and posture stability—not a clinical assessment."
        />
        <AnalysisCard
          icon={Timer}
          label="Average tempo"
          value={tempo === null ? '—' : `${tempo.toFixed(1)} sec`}
          detail="Time between completed repetitions."
        />
      </View>
      {nextSessionCue ? (
        <Card tone={feedbackCodes.size > 0 ? 'warning' : 'success'}>
          <View style={styles.progress}>
            <Sparkles color={feedbackCodes.size > 0 ? colors.warning : colors.success} size={24} />
            <View style={styles.progressCopy}>
              <Text style={styles.progressTitle}>Try this next session</Text>
              <Body muted>{nextSessionCue}</Body>
            </View>
          </View>
        </Card>
      ) : null}
      <Card tone="success">
        <View style={styles.progress}>
          <TrendingUp color={colors.success} size={24} />
          <View style={styles.progressCopy}>
            <Text style={styles.progressTitle}>A baseline starts here</Text>
            <Body muted>
              Repeat this movement over time to compare completion, range, and tempo under similar
              settings.
            </Body>
          </View>
        </View>
      </Card>
      <Button
        icon={Repeat2}
        onPress={() => router.replace(`/session/setup?exercise=${exercise?.slug ?? ''}`)}
        variant="secondary"
      >
        Do this exercise again
      </Button>
      <Button onPress={() => router.replace('/(tabs)/progress')}>View progress</Button>
    </Screen>
  );
}

const AnalysisCard = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Move;
  label: string;
  value: string;
  detail: string;
}) => (
  <Card style={styles.analysisCard}>
    <View style={styles.cardIcon}>
      <Icon color={colors.lavenderDark} size={21} />
    </View>
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardValue}>{value}</Text>
    <Text style={styles.cardDetail}>{detail}</Text>
  </Card>
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
  metrics: { flexDirection: 'row', gap: spacing.md },
  grid: { gap: spacing.sm },
  analysisCard: { minHeight: 150 },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardLabel: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  cardValue: { color: colors.ink, fontFamily: typography.display, fontSize: 28 },
  cardDetail: { color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 18 },
  progress: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  progressCopy: { flex: 1, gap: 3 },
  progressTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
});
