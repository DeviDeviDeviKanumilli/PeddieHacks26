import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Body, Chip, Field, Screen, Title } from '@/components/ui';
import { mobileApi } from '@/lib/api';
import { hasApiConfig } from '@/lib/config';
import { discoverExercises } from '@/lib/discovery';
import { exerciseSummaryFromApi } from '@/lib/exercises';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const categories = ['All', 'Strength', 'Mobility', 'Cardio', 'Balance'];

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [personalized, setPersonalized] = useState(true);
  const regions = useAppStore((state) => state.profile.regions);
  const catalog = useAppStore((state) => state.catalog);
  const mergeExercises = useAppStore((state) => state.mergeExercises);
  const mode = useAppStore((state) => state.mode);
  const liveCatalog = useQuery({
    queryKey: ['exercise-catalog'],
    queryFn: () => mobileApi.listExercises(),
    enabled: mode === 'live' && hasApiConfig,
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    if (!liveCatalog.data) return;
    const currentCatalog = useAppStore.getState().catalog;
    mergeExercises(
      liveCatalog.data.data.map((summary) =>
        exerciseSummaryFromApi(
          summary,
          currentCatalog.find((exercise) => exercise.slug === summary.slug),
        ),
      ),
    );
  }, [liveCatalog.data, mergeExercises]);
  const results = useMemo(
    () => discoverExercises({ catalog, regions, personalized, category, query }),
    [catalog, category, personalized, query, regions],
  );
  return (
    <Screen>
      <AppHeader />
      <View style={styles.intro}>
        <Title compact>Explore movement</Title>
        <Body muted>Search the full catalog or let your profile narrow the starting point.</Body>
      </View>
      <View style={styles.searchWrap}>
        <Search color={colors.muted} size={20} />
        <Field
          accessibilityLabel="Search exercises"
          onChangeText={setQuery}
          placeholder="Search exercise or muscle"
          style={styles.search}
          value={query}
        />
      </View>
      <View accessibilityRole="tablist" style={styles.segment}>
        {['For me', 'All exercises'].map((label, index) => {
          const active = personalized === (index === 0);
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={label}
              onPress={() => setPersonalized(index === 0)}
              style={[styles.segmentButton, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.filterLabel}>
        <SlidersHorizontal color={colors.muted} size={17} />
        <Text style={styles.filterText}>Filter by type</Text>
      </View>
      <View style={styles.chips}>
        {categories.map((item) => (
          <Chip
            key={item}
            label={item}
            onPress={() => setCategory(item)}
            selected={category === item}
          />
        ))}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.count}>
        {results.length} exercise{results.length === 1 ? '' : 's'}
      </Text>
      {liveCatalog.isFetching ? (
        <Text accessibilityLiveRegion="polite" style={styles.count}>
          Refreshing reviewed catalog…
        </Text>
      ) : null}
      <View style={styles.list}>
        {results.map((exercise) => (
          <ExerciseCard exercise={exercise} key={exercise.slug} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs, marginTop: spacing.md },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    paddingLeft: spacing.md,
  },
  search: { borderWidth: 0, flex: 1 },
  segment: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.md,
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontFamily: typography.semibold, fontSize: 14 },
  segmentTextActive: { color: colors.ink },
  filterLabel: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  filterText: { color: colors.muted, fontFamily: typography.medium, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  count: { color: colors.muted, fontFamily: typography.medium, fontSize: 13 },
  list: { gap: spacing.md },
});

import { useQuery } from '@tanstack/react-query';
