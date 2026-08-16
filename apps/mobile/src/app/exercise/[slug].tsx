import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Check, CircleAlert, Play, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AnatomyMap } from '@/components/AnatomyMap';
import { Body, Button, Card, Screen, SectionHeading, Title } from '@/components/ui';
import { mobileApi } from '@/lib/api';
import { hasApiConfig } from '@/lib/config';
import { exerciseFromApi } from '@/lib/exercises';
import { exerciseVisuals } from '@/lib/exerciseVisuals';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type Tab = 'overview' | 'how-to' | 'muscles';

export default function ExerciseDetailScreen() {
  const {
    slug,
    tab: routeTab,
    from,
  } = useLocalSearchParams<{
    slug: string;
    tab?: string;
    from?: string;
  }>();
  const [tab, setTab] = useState<Tab>(
    routeTab === 'muscles' || routeTab === 'how-to' ? routeTab : 'overview',
  );
  useEffect(() => {
    if (routeTab === 'overview' || routeTab === 'how-to' || routeTab === 'muscles') {
      setTab(routeTab);
    }
  }, [routeTab]);
  const workout = useAppStore((state) => state.recommendedWorkout);
  const catalog = useAppStore((state) => state.catalog);
  const leave = () =>
    router.replace(from === 'workout' ? `/workout/${workout.id}` : '/(tabs)/explore');
  const fallback = catalog.find((item) => item.slug === slug);
  const mode = useAppStore((state) => state.mode);
  const liveDetail = useQuery({
    queryKey: ['exercise', slug],
    queryFn: () => mobileApi.getExercise(slug),
    enabled: Boolean(slug && mode === 'live' && hasApiConfig),
  });
  const exercise = liveDetail.data ? exerciseFromApi(liveDetail.data, fallback) : fallback;
  if (!exercise)
    return (
      <Screen>
        <Title compact>Exercise not found</Title>
        <Body muted>This movement may no longer be available.</Body>
        <Button onPress={leave}>Go back</Button>
      </Screen>
    );
  return (
    <Screen style={styles.screen}>
      <View style={styles.navigationRow}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={leave}
          style={styles.back}
        >
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.screenTitle}>
          Exercise
        </Text>
      </View>

      <View style={styles.exerciseHeader}>
        <Image
          accessibilityLabel={`Cartoon thumbnail for ${exercise.name}`}
          resizeMode="cover"
          source={exerciseVisuals[exercise.visualKey]}
          style={styles.thumbnail}
        />
        <View style={styles.exerciseIdentity}>
          <Text style={styles.category}>
            {exercise.category} · {exercise.position}
          </Text>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.trackingRow}>
            {exercise.trackingSupported ? <Camera color={colors.muted} size={15} /> : null}
            <Text style={styles.trackingText}>
              {exercise.trackingSupported ? 'Camera tracking optional' : 'Manual tracking'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.summary}>
        <Body muted>{exercise.summary}</Body>
        {liveDetail.isLoading ? (
          <View style={styles.syncRow}>
            <ActivityIndicator color={colors.lavenderDark} size="small" />
            <Text style={styles.syncText}>Loading reviewed exercise details…</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.prescription}>
        <View style={styles.prescriptionItem}>
          <Text style={styles.prescriptionValue}>
            {exercise.sets} × {exercise.reps}
          </Text>
          <Text style={styles.prescriptionLabel}>Sets × reps</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.prescriptionItem}>
          <Text style={styles.prescriptionValue}>{exercise.restSeconds}s</Text>
          <Text style={styles.prescriptionLabel}>Rest</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.prescriptionItem}>
          <Text style={styles.prescriptionValue}>Level {exercise.difficulty}</Text>
          <Text style={styles.prescriptionLabel}>Difficulty</Text>
        </View>
      </View>

      <View style={styles.fitSection}>
        <View style={styles.fitIcon}>
          {exercise.compatibility === 'compatible' ? (
            <ShieldCheck color={colors.success} size={20} />
          ) : (
            <CircleAlert color={colors.warning} size={20} />
          )}
        </View>
        <View style={styles.fitCopy}>
          <Text style={styles.fitTitle}>
            {exercise.compatibility === 'compatible' ? 'Good fit' : 'Review before starting'}
          </Text>
          <Text style={styles.fitReason}>{exercise.compatibilityReason}</Text>
        </View>
      </View>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {(['overview', 'how-to', 'muscles'] as const).map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
              {item === 'how-to' ? 'How to' : item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'overview' ? (
        <View style={styles.panel}>
          <SectionHeading title="Equipment" />
          <Card>
            <Body>{exercise.equipment.join(' or ')}</Body>
          </Card>
          <SectionHeading title="Adapt it" />
          <Card tone="lavender">
            {exercise.adaptations.map((item) => (
              <Bullet key={item} text={item} />
            ))}
          </Card>
          <SectionHeading title="Safety cues" />
          <Card tone="warning">
            {exercise.safetyCues.map((item) => (
              <Bullet key={item} text={item} />
            ))}
          </Card>
          {liveDetail.data ? (
            <>
              <SectionHeading title="Reviewed sources" />
              <Card>
                {liveDetail.data.sources.map((source) => (
                  <Pressable
                    accessibilityRole="link"
                    key={source.url}
                    onPress={() => void Linking.openURL(source.url)}
                  >
                    <Text style={styles.sourceTitle}>{source.title}</Text>
                    <Text style={styles.sourceMeta}>
                      {source.publisher}
                      {source.publicationYear ? ` · ${source.publicationYear}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </Card>
            </>
          ) : null}
        </View>
      ) : null}
      {tab === 'how-to' ? (
        <View style={styles.panel}>
          <SectionHeading title="Move step by step" />
          {exercise.instructions.map((item, index) => (
            <Card key={item} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepCopy}>
                <Body>{item}</Body>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
      {tab === 'muscles' ? (
        <View style={styles.panel}>
          <SectionHeading title="Muscles worked" />
          <AnatomyMap activations={exercise.muscleActivations} />
          <Card tone="lavender">
            <Body muted>
              Color shows each muscle’s role; the 1–5 value represents this exercise’s relative
              emphasis, not pain or medical status.
            </Body>
          </Card>
        </View>
      ) : null}
      <Button icon={Play} onPress={() => router.push(`/session/setup?exercise=${exercise.slug}`)}>
        Set up exercise
      </Button>
    </Screen>
  );
}

const Bullet = ({ text }: { text: string }) => (
  <View style={styles.bullet}>
    <Check color={colors.lavenderDark} size={18} />
    <Body>{text}</Body>
  </View>
);

const styles = StyleSheet.create({
  screen: { gap: spacing.md },
  navigationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 48,
  },
  back: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  screenTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 17,
    marginLeft: spacing.sm,
  },
  exerciseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumbnail: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    height: 96,
    width: 96,
  },
  exerciseIdentity: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  exerciseName: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  trackingRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  trackingText: { color: colors.muted, fontFamily: typography.medium, fontSize: 12 },
  summary: { gap: spacing.xs },
  syncRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  syncText: { color: colors.muted, fontFamily: typography.medium, fontSize: 12 },
  category: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  prescription: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  prescriptionItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xxs,
  },
  metricDivider: { backgroundColor: colors.line, width: 1 },
  prescriptionValue: { color: colors.ink, fontFamily: typography.semibold, fontSize: 15 },
  prescriptionLabel: { color: colors.muted, fontFamily: typography.medium, fontSize: 11 },
  fitSection: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  fitIcon: { paddingTop: 1 },
  fitCopy: { flex: 1, gap: 2 },
  fitTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 15 },
  fitReason: { color: colors.muted, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
  sourceTitle: { color: colors.lavenderDark, fontFamily: typography.semibold, fontSize: 14 },
  sourceMeta: { color: colors.muted, fontFamily: typography.body, fontSize: 12 },
  tabs: { borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row' },
  tab: { alignItems: 'center', flex: 1, minHeight: 48, justifyContent: 'center' },
  tabActive: { borderBottomColor: colors.lavenderDark, borderBottomWidth: 3 },
  tabText: { color: colors.muted, fontFamily: typography.semibold, fontSize: 14 },
  tabTextActive: { color: colors.lavenderDark },
  panel: { gap: spacing.md },
  bullet: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  step: { alignItems: 'center', flexDirection: 'row', padding: spacing.md },
  stepCopy: { flex: 1, minWidth: 0, paddingRight: spacing.xs },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    flexShrink: 0,
    width: 38,
  },
  stepNumberText: { color: colors.lavenderDark, fontFamily: typography.bold },
});
