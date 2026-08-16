import { useQuery } from '@tanstack/react-query';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronRight, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ExerciseCard } from '@/components/ExerciseCard';
import { MovementMark } from '@/components/MovementMark';
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
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { Exercise } from '@/types';

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
    <MovementMark category={collection.mark} size={50} tone={collection.tone} />
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
  const { add, replace } = useLocalSearchParams<{ add?: string; replace?: string }>();
  const picking = add === '1' || Boolean(replace);
  const regions = useAppStore((state) => state.profile.regions);
  const catalog = useAppStore((state) => state.catalog);
  const mergeExercises = useAppStore((state) => state.mergeExercises);
  const addWorkoutExercise = useAppStore((state) => state.addWorkoutExercise);
  const setRecommendedWorkout = useAppStore((state) => state.setRecommendedWorkout);
  const workout = useAppStore((state) => state.recommendedWorkout);
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
  const plannedSlugs = new Set(workout.items.map((item) => item.exerciseSlug));
  const selectable = picking
    ? results.filter((exercise) => replace || !plannedSlugs.has(exercise.slug))
    : results;
  const recommended = picking ? selectable : selectable.slice(0, 2);

  const pickExercise = (exercise: Exercise) => {
    if (replace) {
      setRecommendedWorkout({
        ...workout,
        items: workout.items.map((item) =>
          item.id === replace
            ? {
                ...item,
                exerciseSlug: exercise.slug,
                sets: exercise.sets,
                reps: exercise.reps,
                restSeconds: exercise.restSeconds,
              }
            : item,
        ),
      });
    } else {
      addWorkoutExercise(exercise);
    }
    router.replace(`/workout/${workout.id}`);
  };

  const selectTab = (forMe: boolean) => {
    setPersonalized(forMe);
    setCategory('All');
  };

  return (
    <Screen style={styles.screen}>
      {picking ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.replace(`/workout/${workout.id}`)}
          style={styles.back}
        >
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
      ) : null}
      <Title compact>{picking ? (replace ? 'Swap exercise' : 'Add exercise') : 'Explore'}</Title>

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

      {searching || picking ? (
        <>
          <SectionHeading
            title={
              picking ? (replace ? 'Choose a replacement' : 'Choose an exercise') : 'Search results'
            }
          />
          <Text accessibilityLiveRegion="polite" style={styles.count}>
            {selectable.length} exercise{selectable.length === 1 ? '' : 's'}
          </Text>
          <View style={styles.list}>
            {selectable.map((exercise) => (
              <ExerciseCard
                exercise={exercise}
                key={exercise.slug}
                {...(picking ? { onPress: () => pickExercise(exercise) } : {})}
              />
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
  collectionCopy: { flex: 1, gap: 2 },
  collectionTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 16 },
  collectionCount: { color: colors.muted, fontFamily: typography.body, fontSize: 13 },
  pressed: { opacity: 0.7 },
});
