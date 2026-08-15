import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';

export const Screen = ({
  children,
  scroll = true,
  padded = true,
  style,
}: PropsWithChildren<{ scroll?: boolean; padded?: boolean; style?: ViewStyle }>) => {
  const content = <View style={[styles.content, padded && styles.padded, style]}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

export const Eyebrow = ({ children }: PropsWithChildren) => (
  <Text style={styles.eyebrow}>{children}</Text>
);

export const Title = ({ children, compact = false }: PropsWithChildren<{ compact?: boolean }>) => (
  <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
    {children}
  </Text>
);

export const Body = ({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) => (
  <Text style={[styles.body, muted && styles.bodyMuted]}>{children}</Text>
);

export const Card = ({
  children,
  tone = 'default',
  style,
}: PropsWithChildren<{
  tone?: 'default' | 'lavender' | 'success' | 'warning' | 'danger';
  style?: ViewStyle;
}>) => <View style={[styles.card, cardTones[tone], style]}>{children}</View>;

export const Button = ({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon: Icon,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  accessibilityLabel?: string;
}) => {
  const haptics = useAppStore((state) => state.profile.accessibility.includes('Haptic feedback'));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={() => {
        if (haptics) void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        buttonVariants[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.lavenderDark} />
      ) : (
        <>
          {Icon ? (
            <Icon color={variant === 'primary' ? colors.surface : colors.lavenderDark} size={20} />
          ) : null}
          <Text style={[styles.buttonText, buttonTextVariants[variant]]}>{children}</Text>
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
  const haptics = useAppStore((state) => state.profile.accessibility.includes('Haptic feedback'));
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        if (haptics) void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && chipSelected[tone],
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
};

export const Field = (props: TextInputProps) => (
  <TextInput
    placeholderTextColor={colors.neutral}
    selectionColor={colors.lavender}
    {...props}
    style={[styles.field, props.style]}
  />
);

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
  scroll: { flexGrow: 1 },
  content: { flex: 1, gap: spacing.md, paddingBottom: 110 },
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
    padding: spacing.lg,
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
  buttonText: { fontFamily: typography.semibold, fontSize: 16 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.46 },
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
    marginTop: spacing.sm,
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
