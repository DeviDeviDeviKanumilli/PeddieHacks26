import { router } from 'expo-router';
import { ChevronRight, CircleAlert } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { movementMarkBackgrounds, movementMarkColors, movementMarks } from '@/lib/movementMarks';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { Exercise } from '@/types';

const tone = {
  compatible: { label: 'Good fit', color: colors.success },
  caution: { label: 'Review first', color: colors.warning },
  incompatible: { label: 'Not recommended', color: colors.danger },
};

export const ExerciseCard = ({ exercise }: { exercise: Exercise }) => {
  const status = tone[exercise.compatibility];
  return (
    <Pressable
      accessibilityHint="Opens exercise details"
      accessibilityLabel={`${exercise.name}. ${status.label}. ${exercise.summary}`}
      accessibilityRole="button"
      onPress={() => router.push(`/exercise/${exercise.slug}`)}
    >
      {({ pressed }) => (
        <View style={[styles.card, pressed && styles.pressed]}>
          <View
            style={[
              styles.markWrap,
              { backgroundColor: movementMarkBackgrounds[exercise.category] },
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={`${exercise.category} movement symbol`}
              resizeMode="contain"
              source={movementMarks[exercise.category]}
              style={[styles.mark, { tintColor: movementMarkColors[exercise.category] }]}
            />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={styles.name}>
                {exercise.name}
              </Text>
              <View style={styles.status}>
                {exercise.compatibility !== 'compatible' ? (
                  <CircleAlert color={status.color} size={12} />
                ) : (
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                )}
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.summary}>
              {exercise.summary}
            </Text>
            <Text style={styles.metaText}>
              {exercise.position} · {exercise.sets} sets × {exercise.reps} reps · Level{' '}
              {exercise.difficulty}
            </Text>
          </View>
          <ChevronRight color={colors.neutral} size={20} />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 92,
    padding: spacing.sm,
  },
  markWrap: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  mark: { height: 44, width: 44 },
  copy: { flex: 1, gap: 4 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statusDot: { borderRadius: radii.pill, height: 7, width: 7 },
  statusText: { fontFamily: typography.semibold, fontSize: 10 },
  name: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 17,
    letterSpacing: -0.25,
  },
  summary: { color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 18 },
  metaText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});
