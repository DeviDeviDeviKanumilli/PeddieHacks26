import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export const OnboardingHeader = ({ step, total = 6 }: { step: number; total?: number }) => (
  <View style={styles.wrap}>
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      onPress={() => router.back()}
      style={styles.back}
    >
      <ArrowLeft color={colors.ink} size={21} />
    </Pressable>
    <View style={styles.progress}>
      <View style={[styles.fill, { width: `${Math.round((step / total) * 100)}%` }]} />
    </View>
    <Text style={styles.count}>
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
