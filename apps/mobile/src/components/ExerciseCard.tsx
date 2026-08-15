import { router } from 'expo-router';
import { ArrowUpRight, CircleAlert, MapPin } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { exerciseVisuals } from '@/lib/exerciseVisuals';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { Exercise } from '@/types';

const tone = {
  compatible: { label: 'Good fit', color: colors.success, background: colors.successSoft },
  caution: { label: 'Review first', color: colors.warning, background: colors.warningSoft },
  incompatible: { label: 'Not recommended', color: colors.danger, background: colors.dangerSoft },
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
        <Card {...(pressed ? { style: styles.pressed } : {})}>
          <View style={styles.top}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={exerciseVisuals[exercise.visualKey]}
              style={styles.art}
            />
            <View style={styles.copy}>
              <View style={[styles.status, { backgroundColor: status.background }]}>
                {exercise.compatibility !== 'compatible' ? (
                  <CircleAlert color={status.color} size={13} />
                ) : null}
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
              <Text style={styles.name}>{exercise.name}</Text>
              <Text numberOfLines={2} style={styles.summary}>
                {exercise.summary}
              </Text>
            </View>
            <ArrowUpRight color={colors.lavenderDark} size={20} />
          </View>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <MapPin color={colors.muted} size={14} />
              <Text style={styles.metaText}>{exercise.position}</Text>
            </View>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>
              {exercise.sets} sets × {exercise.reps} reps
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>Level {exercise.difficulty}</Text>
          </View>
        </Card>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  top: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  art: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.md,
    height: 86,
    width: 76,
  },
  copy: { flex: 1, gap: 4 },
  status: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontFamily: typography.semibold, fontSize: 11 },
  name: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17, letterSpacing: -0.25 },
  summary: { color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 18 },
  meta: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: spacing.sm,
  },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  metaText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  dot: { color: colors.neutral },
});
