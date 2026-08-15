import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Check,
  CircleAlert,
  Clock3,
  Dumbbell,
  Play,
  Repeat2,
  ShieldCheck,
} from 'lucide-react-native';
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
  const { slug, tab: routeTab } = useLocalSearchParams<{ slug: string; tab?: string }>();
  const [tab, setTab] = useState<Tab>(
    routeTab === 'muscles' || routeTab === 'how-to' ? routeTab : 'overview',
  );
  useEffect(() => {
    if (routeTab === 'overview' || routeTab === 'how-to' || routeTab === 'muscles') {
      setTab(routeTab);
    }
  }, [routeTab]);
  const catalog = useAppStore((state) => state.catalog);
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
        <Button onPress={() => router.back()}>Go back</Button>
      </Screen>
    );
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
      <View style={styles.art}>
        <Image
          accessibilityLabel={`Cartoon movement-family illustration for ${exercise.name}`}
          resizeMode="contain"
          source={exerciseVisuals[exercise.visualKey]}
          style={styles.artImage}
        />
        <View style={styles.trackingBadge}>
          {exercise.trackingSupported ? <Camera color={colors.lavenderDark} size={14} /> : null}
          <Text style={styles.trackingText}>
            {exercise.trackingSupported ? 'Optional tracking available' : 'Manual tracking'}
          </Text>
        </View>
        <View style={styles.illustrationBadge}>
          <Text style={styles.illustrationText}>Movement family</Text>
        </View>
      </View>
      <View style={styles.intro}>
        <Text style={styles.category}>
          {exercise.category} · {exercise.position}
        </Text>
        <Title compact>{exercise.name}</Title>
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
          <Repeat2 color={colors.lavenderDark} size={20} />
          <Text style={styles.prescriptionValue}>
            {exercise.sets} × {exercise.reps}
          </Text>
          <Text style={styles.prescriptionLabel}>sets × reps</Text>
        </View>
        <View style={styles.prescriptionItem}>
          <Clock3 color={colors.lavenderDark} size={20} />
          <Text style={styles.prescriptionValue}>{exercise.restSeconds}s</Text>
          <Text style={styles.prescriptionLabel}>rest</Text>
        </View>
        <View style={styles.prescriptionItem}>
          <Dumbbell color={colors.lavenderDark} size={20} />
          <Text style={styles.prescriptionValue}>Level {exercise.difficulty}</Text>
          <Text style={styles.prescriptionLabel}>difficulty</Text>
        </View>
      </View>
      <Card
        tone={
          exercise.compatibility === 'compatible'
            ? 'success'
            : exercise.compatibility === 'caution'
              ? 'warning'
              : 'danger'
        }
      >
        <View style={styles.fitRow}>
          {exercise.compatibility === 'compatible' ? (
            <ShieldCheck color={colors.success} size={22} />
          ) : (
            <CircleAlert color={colors.warning} size={22} />
          )}
          <Text style={styles.fitTitle}>
            {exercise.compatibility === 'compatible' ? 'Why this fits' : 'Review before starting'}
          </Text>
        </View>
        <Body muted>{exercise.compatibilityReason}</Body>
      </Card>
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
              <Body>{item}</Body>
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
  art: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.lg,
    height: 220,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artImage: { height: '100%', width: '100%' },
  trackingBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'absolute',
  },
  trackingText: { color: colors.ink, fontFamily: typography.semibold, fontSize: 11 },
  illustrationBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.pill,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'absolute',
    top: spacing.md,
  },
  illustrationText: { color: colors.muted, fontFamily: typography.semibold, fontSize: 10 },
  intro: { gap: spacing.xs },
  syncRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  syncText: { color: colors.muted, fontFamily: typography.medium, fontSize: 12 },
  category: {
    color: colors.lavenderDark,
    fontFamily: typography.bold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  prescription: { flexDirection: 'row', gap: spacing.xs },
  prescriptionItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    padding: spacing.sm,
  },
  prescriptionValue: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14 },
  prescriptionLabel: { color: colors.muted, fontFamily: typography.medium, fontSize: 11 },
  fitRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  fitTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
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
  stepNumber: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  stepNumberText: { color: colors.lavenderDark, fontFamily: typography.bold },
});
