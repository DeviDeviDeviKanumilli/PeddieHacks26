import { router, useLocalSearchParams } from 'expo-router';
import { Activity, ArrowLeft, Gauge, Move, Repeat2, Timer, TrendingUp } from 'lucide-react-native';
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
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function AnalysisScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const catalog = useAppStore((state) => state.catalog);
  const mode = useAppStore((state) => state.mode);
  const exercise = catalog.find((item) => item.slug === params.exercise);
  const tracked = params.tracking === '1';
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
        onPress={() => router.back()}
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
              : tracked
                ? '82° demo'
                : 'Not measured'
          }
          detail={
            tracked
              ? 'Within the configured target on most demo reps.'
              : 'Turn on supported tracking to measure range.'
          }
        />
        <AnalysisCard
          icon={Gauge}
          label="Control"
          value={
            analysis?.movementControl !== null && analysis?.movementControl !== undefined
              ? `${Math.round(analysis.movementControl)}%`
              : tracked
                ? '8/10 demo'
                : 'Not measured'
          }
          detail={
            tracked
              ? 'Movement remained mostly smooth.'
              : 'No form score is inferred from manual reps.'
          }
        />
        <AnalysisCard
          icon={Activity}
          label="Stability"
          value={
            analysis?.stability !== null && analysis?.stability !== undefined
              ? `${Math.round(analysis.stability)}%`
              : tracked
                ? '9/10 demo'
                : 'Not measured'
          }
          detail={
            tracked
              ? 'No sustained side lean detected in the demo.'
              : 'Camera-based stability was unavailable.'
          }
        />
        <AnalysisCard
          icon={Timer}
          label="Average tempo"
          value={tempo === null ? '—' : `${tempo.toFixed(1)} sec`}
          detail="Time between completed repetitions."
        />
      </View>
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

import { useQuery } from '@tanstack/react-query';
