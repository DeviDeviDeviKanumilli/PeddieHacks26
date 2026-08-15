import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Clock3, Dumbbell, Lightbulb, Search } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { Button, Card, Screen, SectionHeading } from '@/components/ui';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const timeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const QuickAction = ({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
  >
    <View style={styles.quickActionIcon}>
      <Icon color={colors.lavenderDark} size={24} />
    </View>
    <Text numberOfLines={2} style={styles.quickActionLabel}>
      {label}
    </Text>
  </Pressable>
);

export default function HomeScreen() {
  const workout = useAppStore((state) => state.recommendedWorkout);
  const hasWorkout = workout.items.length > 0;

  return (
    <Screen style={styles.screen}>
      <AppHeader />
      <View style={styles.welcomeRow}>
        <View style={styles.welcomeCopy}>
          <Text style={styles.greeting}>{timeOfDayGreeting()},</Text>
          <Text accessibilityRole="header" style={styles.welcomeTitle}>
            Ready to move?
          </Text>
        </View>
      </View>

      <Card tone="lavender" style={styles.planCard}>
        <Text style={styles.planLabel}>Today’s plan</Text>
        <Text style={styles.planTitle}>{workout.title}</Text>
        <View style={styles.planMeta}>
          <Dumbbell color={colors.muted} size={17} />
          <Text style={styles.planMetaText}>{workout.items.length} exercises</Text>
          <View style={styles.metaDot} />
          <Clock3 color={colors.muted} size={17} />
          <Text style={styles.planMetaText}>{workout.durationMinutes} min</Text>
        </View>
        <Button disabled={!hasWorkout} onPress={() => router.push(`/workout/${workout.id}`)}>
          {hasWorkout ? 'Start workout' : 'No matching workout yet'}
        </Button>
      </Card>

      <View style={styles.tipCard}>
        <View style={styles.tipCopy}>
          <Text style={styles.tipLabel}>Daily tip</Text>
          <Text style={styles.tipText}>Focus on quality reps over quantity.</Text>
        </View>
        <View style={styles.tipIcon}>
          <Lightbulb color={colors.lavenderDark} size={28} strokeWidth={1.8} />
        </View>
      </View>

      <SectionHeading title="Quick actions" />
      <View style={styles.quickActions}>
        <QuickAction
          icon={Dumbbell}
          label="Build workout"
          onPress={() => router.push('/(tabs)/workout')}
        />
        <QuickAction
          icon={Search}
          label="Explore exercises"
          onPress={() => router.push('/(tabs)/explore')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.md },
  welcomeRow: {
    justifyContent: 'center',
    minHeight: 88,
  },
  welcomeCopy: { gap: spacing.xxs },
  greeting: { color: colors.muted, fontFamily: typography.medium, fontSize: 16 },
  welcomeTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 34,
    letterSpacing: -0.7,
    lineHeight: 38,
  },
  planCard: { gap: spacing.sm, padding: spacing.lg },
  planLabel: { color: colors.muted, fontFamily: typography.medium, fontSize: 15 },
  planTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 30,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  planMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  planMetaText: { color: colors.muted, fontFamily: typography.medium, fontSize: 14 },
  metaDot: { backgroundColor: colors.neutral, borderRadius: 3, height: 4, width: 4 },
  tipCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  tipCopy: { flex: 1, gap: spacing.xxs },
  tipLabel: { color: colors.ink, fontFamily: typography.semibold, fontSize: 16 },
  tipText: { color: colors.muted, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
  tipIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 84,
    padding: spacing.md,
  },
  quickActionIcon: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  quickActionLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 15,
    lineHeight: 19,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
