import { useSegments } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionHaptic, useAccessibility } from '@/lib/accessibility';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';

// shared chrome. keep hit targets ≥44pt and honor reduced-motion / one-handed.
export const Screen = ({
  children,
  scroll = true,
  padded = true,
  style,
}: PropsWithChildren<{ scroll?: boolean; padded?: boolean; style?: ViewStyle }>) => {
  const insets = useSafeAreaInsets();
  const inTabs = useSegments()[0] === '(tabs)';
  const { oneHanded } = useAccessibility();
  // only pin the top inset. tabs already have a bar; stacks need extra bottom padding.
  const content = (
    <View
      style={[
        styles.content,
        padded && styles.padded,
        {
          paddingBottom: spacing.md + (oneHanded ? spacing.xl : 0) + (inTabs ? 0 : insets.bottom),
        },
        style,
      ]}
    >
      {/* one-handed scoots content up so primary buttons sit in thumb reach. */}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {scroll ? (
        <ScrollView
          alwaysBounceVertical={false}
          bounces={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
          {/* bounce off: short screens shouldn't rubber-band over the canvas. */}
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

export const Eyebrow = ({ children }: PropsWithChildren) => {
  const { highContrast, textScale } = useAccessibility();
  // uppercase label; high contrast drops the lavender so it still reads.
  return (
    <Text
      style={[
        styles.eyebrow,
        { fontSize: 12 * textScale },
        highContrast && styles.highContrastText,
      ]}
    >
      {children}
    </Text>
  );
};

export const Title = ({ children, compact = false }: PropsWithChildren<{ compact?: boolean }>) => {
  const { textScale } = useAccessibility();
  const size = (compact ? 34 : 42) * textScale;
  // scale type ourselves — system font scaling alone would clip the display size.
  return (
    <Text
      accessibilityRole="header"
      style={[
        styles.title,
        compact && styles.titleCompact,
        { fontSize: size, lineHeight: size + 4 },
      ]}
    >
      {children}
    </Text>
  );
};

export const Body = ({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) => {
  const { highContrast, textScale } = useAccessibility();
  // muted + high contrast stays ink. don't fade copy that people need.
  return (
    <Text
      style={[
        styles.body,
        { fontSize: 16 * textScale, lineHeight: 24 * textScale },
        muted && (highContrast ? styles.highContrastText : styles.bodyMuted),
      ]}
    >
      {children}
    </Text>
  );
};

export const Card = ({
  children,
  tone = 'default',
  style,
}: PropsWithChildren<{
  tone?: 'default' | 'lavender' | 'success' | 'warning' | 'danger';
  style?: ViewStyle;
}>) => {
  const { highContrast } = useAccessibility();
  // tone is background only. high contrast adds a 2pt ink border.
  return (
    <View style={[styles.card, cardTones[tone], highContrast && styles.highContrastBorder, style]}>
      {children}
    </View>
  );
};

export const AccessiblePressable = ({ onPress, ...props }: PressableProps) => (
  <Pressable
    {...props}
    onPress={(event) => {
      void selectionHaptic();
      onPress?.(event);
    }}
  />
);
// haptic on every press. no-ops if the preference is off.

export const Button = ({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon: Icon,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) => {
  const { controlMinHeight, highContrast, reducedMotion, textScale } = useAccessibility();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={() => {
        void selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        buttonVariants[variant],
        { minHeight: controlMinHeight + 6 },
        highContrast && styles.highContrastBorder,
        pressed && !disabled && (reducedMotion ? styles.pressedStatic : styles.pressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* reduced motion skips the scale so the press state isn't a bounce. */}
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.lavenderDark} />
      ) : (
        <>
          {Icon ? (
            <Icon
              accessibilityElementsHidden
              color={variant === 'primary' ? colors.surface : colors.lavenderDark}
              size={20}
            />
          ) : null}
          <Text
            style={[styles.buttonText, buttonTextVariants[variant], { fontSize: 16 * textScale }]}
          >
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
};

export const Chip = ({
  label,
  selected,
  onPress,
  tone = 'lavender',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: 'lavender' | 'danger' | 'success';
}) => {
  const { controlMinHeight, highContrast, reducedMotion, textScale } = useAccessibility();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        void selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        { minHeight: Math.max(46, controlMinHeight - 4) },
        selected && chipSelected[tone],
        highContrast && styles.highContrastBorder,
        pressed && (reducedMotion ? styles.pressedStatic : styles.pressed),
      ]}
    >
      {/* checkbox role: these are toggles, not navigation. floor is 46pt. */}
      <Text
        style={[styles.chipText, selected && styles.chipTextSelected, { fontSize: 14 * textScale }]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const Field = (props: TextInputProps) => {
  const { highContrast, textScale } = useAccessibility();
  return (
    <TextInput
      allowFontScaling
      placeholderTextColor={highContrast ? colors.ink : colors.neutral}
      selectionColor={colors.lavender}
      {...props}
      style={[
        styles.field,
        { fontSize: 16 * textScale, minHeight: 52 * Math.max(1, textScale) },
        highContrast && styles.highContrastBorder,
        props.style,
      ]}
    />
  );
};
// 52pt field so the tap target survives text scale.

export const SectionHeading = ({ title, action }: { title: string; action?: ReactNode }) => (
  <View style={styles.sectionHeading}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {title}
    </Text>
    {action}
  </View>
);

export const Metric = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.metric}>
    <Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>
      {value}
    </Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);
// shrink-to-fit so 3-up metrics don't wrap on small phones.

const cardTones = StyleSheet.create({
  default: { backgroundColor: colors.surface },
  lavender: { backgroundColor: colors.lavenderSoft },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.warningSoft },
  danger: { backgroundColor: colors.dangerSoft },
});

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: colors.lavenderDark, borderColor: colors.lavenderDark },
  secondary: { backgroundColor: colors.lavenderSoft, borderColor: colors.lavender },
  quiet: { backgroundColor: 'transparent', borderColor: colors.line },
  danger: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
});

const buttonTextVariants = StyleSheet.create({
  primary: { color: colors.surface },
  secondary: { color: colors.lavenderDark },
  quiet: { color: colors.ink },
  danger: { color: colors.danger },
});

const chipSelected = StyleSheet.create({
  lavender: { backgroundColor: colors.lavenderDark, borderColor: colors.lavenderDark },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger },
  success: { backgroundColor: colors.success, borderColor: colors.success },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 0 },
  content: { gap: spacing.sm },
  padded: { paddingHorizontal: spacing.lg },
  eyebrow: {
    color: colors.lavenderDark,
    fontFamily: typography.bold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 42,
    letterSpacing: -1.2,
    lineHeight: 46,
  },
  titleCompact: { fontSize: 34, lineHeight: 38 },
  body: { color: colors.ink, fontFamily: typography.body, fontSize: 16, lineHeight: 24 },
  bodyMuted: { color: colors.muted },
  card: {
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadow,
  },
  button: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  // 54pt default; one-handed can raise the min height further.
  buttonText: { fontFamily: typography.semibold, fontSize: 16 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  pressedStatic: { opacity: 0.76 },
  disabled: { opacity: 0.46 },
  highContrastText: { color: colors.ink },
  highContrastBorder: { borderColor: colors.ink, borderWidth: 2 },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.ink, fontFamily: typography.medium, fontSize: 14 },
  chipTextSelected: { color: colors.surface },
  field: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 20 },
  metric: {
    flex: 1,
    minWidth: 88,
    gap: spacing.xxs,
  },
  metricValue: { color: colors.ink, fontFamily: typography.display, fontSize: 30 },
  metricLabel: { color: colors.muted, fontFamily: typography.medium, fontSize: 12 },
});
