import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react-native';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/components/Brand';
import { AccessiblePressable, Body, Button, Field, Screen } from '@/components/ui';
import { notifyHaptic, speakFeedback, useAccessibility } from '@/lib/accessibility';
import { hasSupabaseConfig } from '@/lib/config';
import { getSupabaseClient } from '@/lib/supabase';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type AuthMode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const profileComplete = useAppStore((state) => state.profile.onboardingComplete);
  const canAuth = hasSupabaseConfig;
  const signingUp = authMode === 'sign-up';
  const { highContrast, oneHanded, reducedMotion, textScale } = useAccessibility();

  const continueAsGuest = () => {
    void notifyHaptic('success');
    speakFeedback('Continuing as guest.');
    router.replace(profileComplete ? '/(tabs)' : '/onboarding/goals');
  };

  const submit = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      const detail = 'Account sync is not configured in this build. Continue as a guest instead.';
      setMessage(detail);
      void notifyHaptic('warning');
      speakFeedback(detail);
      return;
    }
    if (!email.trim() || password.length < 8) {
      const detail = 'Enter an email and a password with at least 8 characters.';
      setMessage(detail);
      void notifyHaptic('warning');
      speakFeedback(detail);
      return;
    }

    setLoading(true);
    setMessage(null);
    const credentials = { email: email.trim(), password };
    const result = signingUp
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials);
    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      void notifyHaptic('error');
      speakFeedback(result.error.message);
      return;
    }
    if (signingUp && !result.data.session) {
      const detail = 'Check your email to confirm your account, then return here to sign in.';
      setMessage(detail);
      setAuthMode('sign-in');
      void notifyHaptic('success');
      speakFeedback(detail);
      return;
    }
    void notifyHaptic('success');
    speakFeedback(signingUp ? 'Account created.' : 'Signed in.');
    router.replace(profileComplete ? '/(tabs)' : '/onboarding/goals');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}
    >
      <Screen style={styles.screen}>
        <View style={styles.top}>
          <AccessiblePressable
            accessibilityHint="Returns to the previous screen"
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.replace('/onboarding/welcome')}
            style={styles.back}
          >
            <ArrowLeft accessibilityElementsHidden color={colors.ink} size={22} />
          </AccessiblePressable>
          <Brand />
          <View style={styles.intro}>
            <Text style={[styles.eyebrow, { fontSize: 11 * textScale }]}>
              {signingUp ? 'New account' : 'Welcome'}
            </Text>
            <Text
              accessibilityRole="header"
              style={[styles.title, { fontSize: 36 * textScale, lineHeight: 40 * textScale }]}
            >
              {signingUp ? 'Create your account.' : 'Welcome back.'}
            </Text>
            <Body muted>
              {signingUp
                ? 'Save your movement profile and history across devices. Camera and pose stay here.'
                : 'Sign in to sync your movement profile and workout history.'}
            </Body>
          </View>
        </View>

        <View accessibilityRole="tablist" style={styles.modeSwitch}>
          {(
            [
              ['sign-in', 'Sign in'],
              ['sign-up', 'Sign up'],
            ] as const
          ).map(([mode, label]) => {
            const selected = authMode === mode;
            return (
              <AccessiblePressable
                accessibilityHint={
                  mode === 'sign-up'
                    ? 'Switches to creating a new AdaptFit account'
                    : 'Switches to signing in with an existing account'
                }
                accessibilityLabel={label}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={mode}
                onPress={() => {
                  setAuthMode(mode);
                  setMessage(null);
                  speakFeedback(mode === 'sign-up' ? 'Sign up' : 'Sign in');
                }}
                style={[
                  styles.modeTab,
                  { minHeight: oneHanded ? 48 : 44 },
                  selected && styles.modeTabActive,
                  highContrast && styles.highContrastBorder,
                ]}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    { fontSize: 14 * textScale },
                    selected && styles.modeTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </AccessiblePressable>
            );
          })}
        </View>

        <View style={styles.form}>
          <AuthField
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            icon={Mail}
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            returnKeyType="next"
            spellCheck={false}
            textContentType="emailAddress"
            value={email}
          />
          <AuthField
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={signingUp ? 'new-password' : 'current-password'}
            icon={LockKeyhole}
            label="Password"
            onChangeText={setPassword}
            onSubmitEditing={() => {
              if (canAuth) void submit();
            }}
            placeholder="At least 8 characters"
            returnKeyType="done"
            secureTextEntry={!showPassword}
            textContentType={signingUp ? 'newPassword' : 'password'}
            trailing={
              <AccessiblePressable
                accessibilityHint={
                  showPassword ? 'Hides the password characters' : 'Shows the password characters'
                }
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setShowPassword((current) => !current)}
                style={styles.eye}
              >
                {showPassword ? (
                  <EyeOff accessibilityElementsHidden color={colors.muted} size={18} />
                ) : (
                  <Eye accessibilityElementsHidden color={colors.muted} size={18} />
                )}
              </AccessiblePressable>
            }
            value={password}
            {...(signingUp
              ? {
                  hint: 'Use 8 or more characters.',
                  accessibilityHint: 'Must be at least 8 characters',
                }
              : {})}
          />
        </View>

        {message ? (
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.message}
          >
            {message}
          </Text>
        ) : !canAuth ? (
          <Text accessibilityLiveRegion="polite" style={styles.note}>
            This build works fully as a guest. Account sync turns on with hosted keys.
          </Text>
        ) : null}

        {canAuth ? (
          <Button
            accessibilityLabel={signingUp ? 'Create account' : 'Sign in'}
            loading={loading}
            onPress={() => void submit()}
            style={styles.cta}
          >
            {signingUp ? 'Create account' : 'Sign in'}
          </Button>
        ) : (
          <Button
            accessibilityLabel="Continue as guest"
            onPress={continueAsGuest}
            style={styles.cta}
          >
            Continue as guest
          </Button>
        )}

        {canAuth ? (
          <AccessiblePressable
            accessibilityHint="Skip signing in and keep this profile on the device"
            accessibilityLabel="Continue as guest"
            accessibilityRole="button"
            onPress={continueAsGuest}
            style={({ pressed }) => [
              styles.guestLink,
              pressed && (reducedMotion ? styles.pressedStatic : styles.pressed),
            ]}
          >
            <Text style={[styles.guestLinkText, { fontSize: 15 * textScale }]}>
              Continue as guest
            </Text>
          </AccessiblePressable>
        ) : (
          <Text style={styles.disabledHint}>
            Sign in stays available when this build is connected.
          </Text>
        )}

        <View accessible style={styles.privacy}>
          <Check accessibilityElementsHidden color={colors.success} size={16} strokeWidth={2.2} />
          <Text style={styles.privacyText}>Camera and pose stay on this device.</Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const AuthField = ({
  icon: Icon,
  label,
  hint,
  trailing,
  ...props
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  trailing?: ReactNode;
} & ComponentProps<typeof Field>) => {
  const [focused, setFocused] = useState(false);
  const { highContrast, textScale } = useAccessibility();
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { fontSize: 13 * textScale }]}>{label}</Text>
      <View
        style={[
          styles.fieldShell,
          focused && styles.fieldShellFocused,
          highContrast && styles.highContrastBorder,
        ]}
      >
        <Icon
          accessibilityElementsHidden
          color={focused ? colors.lavenderDark : colors.muted}
          size={18}
        />
        <Field
          {...props}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          style={styles.fieldInput}
        />
        {trailing}
      </View>
      {hint ? <Text style={[styles.hint, { fontSize: 13 * textScale }]}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  screen: { gap: spacing.md },
  top: { gap: spacing.md },
  back: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginLeft: -10,
    width: 44,
  },
  intro: { gap: spacing.xs },
  eyebrow: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 36,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  modeSwitch: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  modeTab: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  modeTabActive: { backgroundColor: colors.lavenderDark },
  modeTabText: { color: colors.muted, fontFamily: typography.semibold, fontSize: 14 },
  modeTabTextActive: { color: colors.surface },
  form: { gap: spacing.md },
  fieldBlock: { gap: 8 },
  label: { color: colors.ink, fontFamily: typography.semibold, fontSize: 13 },
  fieldShell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  fieldShellFocused: { borderColor: colors.lavender },
  fieldInput: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 0,
  },
  eye: { alignItems: 'center', height: 44, justifyContent: 'center', width: 36 },
  hint: { color: colors.muted, fontFamily: typography.body, fontSize: 13 },
  message: { color: colors.ink, fontFamily: typography.medium, fontSize: 14, lineHeight: 20 },
  note: { color: colors.muted, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
  cta: { borderRadius: radii.pill },
  guestLink: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  guestLinkText: { color: colors.lavenderDark, fontFamily: typography.semibold, fontSize: 15 },
  disabledHint: {
    color: colors.muted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  privacy: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  privacyText: { color: colors.muted, fontFamily: typography.body, fontSize: 13 },
  pressed: { opacity: 0.76 },
  pressedStatic: { opacity: 0.76 },
  highContrastBorder: { borderColor: colors.ink, borderWidth: 2 },
});
