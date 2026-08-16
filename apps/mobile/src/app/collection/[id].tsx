import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Body, Eyebrow, Screen, Title } from '@/components/ui';
import { discoverExercises } from '@/lib/discovery';
import { exercisesInCollection, getExerciseCollection } from '@/lib/exerciseCollections';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const collection = getExerciseCollection(id);
  const catalog = useAppStore((state) => state.catalog);
  const regions = useAppStore((state) => state.profile.regions);
  const compatibleCatalog = useMemo(
    () => discoverExercises({ catalog, regions, personalized: true, category: 'All', query: '' }),
    [catalog, regions],
  );
  // already filtered to the profile — this isn't the full catalog dump.
  const exercises = collection ? exercisesInCollection(compatibleCatalog, collection) : [];

  return (
    <Screen style={styles.screen}>
      <Pressable
        accessibilityLabel="Back to Explore"
        accessibilityRole="button"
        onPress={() => router.replace('/(tabs)/explore')}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        {/* replace to explore so collections don't stack. 44pt pill. */}
        <ChevronLeft color={colors.ink} size={22} />
        <Text style={styles.backText}>Explore</Text>
      </Pressable>

      {collection ? (
        <>
          <View style={styles.intro}>
            <Eyebrow>Collection</Eyebrow>
            <Title compact>{collection.title}</Title>
            <Body muted>{collection.description}</Body>
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.count}>
            {exercises.length} exercise{exercises.length === 1 ? '' : 's'} selected for your profile
          </Text>
          {/* live region so search/filter changes get announced. */}
          <View style={styles.list}>
            {exercises.map((exercise) => (
              <ExerciseCard exercise={exercise} key={exercise.slug} />
            ))}
          </View>
        </>
      ) : (
        <View style={styles.intro}>
          <Eyebrow>Collection unavailable</Eyebrow>
          <Title compact>We couldn’t find that collection.</Title>
          <Body muted>Return to Explore to choose another movement collection.</Body>
        </View>
      )}
      {/* unknown id still renders chrome so back isn't a dead end. */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, paddingTop: spacing.sm },
  back: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  backText: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14 },
  intro: { gap: spacing.xs },
  count: { color: colors.muted, fontFamily: typography.medium, fontSize: 13 },
  list: { gap: spacing.sm },
  pressed: { opacity: 0.7 },
});
