import { type Href, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { AccessiblePressable } from '@/components/ui';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const previousStep: Record<number, Href> = {
  1: '/onboarding/welcome',
  2: '/onboarding/goals',
  3: '/onboarding/movement',
  4: '/onboarding/preferences',
  5: '/onboarding/equipment',
  6: '/onboarding/accessibility',
};

// wizard chrome. replace (not back) so steps don't pile up on the stack.
export const OnboardingHeader = ({ step, total = 6 }: { step: number; total?: number }) => (
  <View style={styles.wrap}>
    <AccessiblePressable
      accessibilityHint="Returns to the previous step"
      accessibilityLabel="Go back"
      accessibilityRole="button"
      onPress={() => router.replace(previousStep[step] ?? '/onboarding/welcome')}
      style={styles.back}
    >
      {/* 44pt. missing map entry falls through to welcome. */}
      <ArrowLeft accessibilityElementsHidden color={colors.ink} size={21} />
    </AccessiblePressable>
    <View
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: step }}
      style={styles.progress}
    >
      {/* visual fill is decorative; the progressbar label is the a11y source. */}
      <View style={[styles.fill, { width: `${Math.round((step / total) * 100)}%` }]} />
    </View>
    <Text accessibilityElementsHidden style={styles.count}>
      {step}/{total}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  back: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  progress: {
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    flex: 1,
    height: 7,
    overflow: 'hidden',
  },
  fill: { backgroundColor: colors.lavenderDark, borderRadius: radii.pill, height: '100%' },
  count: { color: colors.muted, fontFamily: typography.semibold, fontSize: 12 },
});
