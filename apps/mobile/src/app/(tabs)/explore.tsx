import { useQuery } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Chip, Field, Screen, SectionHeading, Title } from '@/components/ui';
import { mobileApi } from '@/lib/api';
import { hasApiConfig } from '@/lib/config';
import { discoverExercises } from '@/lib/discovery';
import {
  type ExerciseCollection,
  exerciseCollections,
  exercisesInCollection,
} from '@/lib/exerciseCollections';
import { exerciseSummaryFromApi } from '@/lib/exercises';
import { movementMarkBackgrounds, movementMarkColors, movementMarks } from '@/lib/movementMarks';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const categories = ['All', 'Strength', 'Mobility', 'Cardio', 'Balance'];

const CollectionRow = ({
  collection,
  count,
}: {
  collection: ExerciseCollection;
  count: number;
}) => (
  <Pressable
    accessibilityHint="Opens this exercise collection"
    accessibilityLabel={`${collection.title}. ${count} exercises.`}
    accessibilityRole="button"
    onPress={() => router.push(`/collection/${collection.id}` as Href)}
    style={({ pressed }) => [styles.collectionRow, pressed && styles.pressed]}
  >
    <View
      style={[
        styles.collectionMarkWrap,
        { backgroundColor: movementMarkBackgrounds[collection.tone] },
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={`${collection.title} collection symbol`}
        resizeMode="contain"
        source={movementMarks[collection.mark]}
        style={[styles.collectionMark, { tintColor: movementMarkColors[collection.tone] }]}
      />
    </View>
    <View style={styles.collectionCopy}>
      <Text style={styles.collectionTitle}>{collection.title}</Text>
      <Text style={styles.collectionCount}>
        {count} exercise{count === 1 ? '' : 's'}
      </Text>
    </View>
    <ChevronRight color={colors.neutral} size={20} />
  </Pressable>
);

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
  const personalizedCatalog = useMemo(
    () => discoverExercises({ catalog, regions, personalized: true, category: 'All', query: '' }),
    [catalog, regions],
  );
  const searching = query.trim().length > 0;
  const recommended = results.slice(0, 2);

  const selectTab = (forMe: boolean) => {
    setPersonalized(forMe);
    setCategory('All');
  };

  return (
    <Screen style={styles.screen}>
      <Title compact>Explore</Title>

      <View style={styles.searchWrap}>
        <Search color={colors.muted} size={20} />
        <Field
          accessibilityLabel="Search exercises"
          onChangeText={setQuery}
          placeholder="Search exercises or muscles"
          returnKeyType="search"
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
              onPress={() => selectTab(index === 0)}
              style={[styles.segmentButton, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {searching ? (
        <>
          <SectionHeading title="Search results" />
          <Text accessibilityLiveRegion="polite" style={styles.count}>
            {results.length} exercise{results.length === 1 ? '' : 's'}
          </Text>
          <View style={styles.list}>
            {results.map((exercise) => (
              <ExerciseCard exercise={exercise} key={exercise.slug} />
            ))}
          </View>
        </>
      ) : personalized ? (
        <>
          <SectionHeading title="Recommended for you" />
          <View style={styles.list}>
            {recommended.map((exercise) => (
              <ExerciseCard exercise={exercise} key={exercise.slug} />
            ))}
          </View>

          <SectionHeading title="Collections" />
          <View style={styles.collections}>
            {exerciseCollections.map((collection) => (
              <CollectionRow
                collection={collection}
                count={exercisesInCollection(personalizedCatalog, collection).length}
                key={collection.id}
              />
            ))}
          </View>
        </>
      ) : (
        <>
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
          <View style={styles.list}>
            {results.map((exercise) => (
              <ExerciseCard exercise={exercise} key={exercise.slug} />
            ))}
          </View>
        </>
      )}

      {liveCatalog.isFetching ? (
        <Text accessibilityLiveRegion="polite" style={styles.refreshing}>
          Refreshing reviewed catalog…
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md },
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
    borderRadius: radii.md,
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontFamily: typography.semibold, fontSize: 14 },
  segmentTextActive: { color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  count: { color: colors.muted, fontFamily: typography.medium, fontSize: 13 },
  refreshing: { color: colors.muted, fontFamily: typography.medium, fontSize: 12 },
  list: { gap: spacing.sm },
  collections: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  collectionRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 78,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  collectionMarkWrap: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  collectionMark: { height: 34, width: 34 },
  collectionCopy: { flex: 1, gap: 2 },
  collectionTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 16 },
  collectionCount: { color: colors.muted, fontFamily: typography.body, fontSize: 13 },
  pressed: { opacity: 0.7 },
});
