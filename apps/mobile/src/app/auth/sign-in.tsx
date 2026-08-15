import { router } from 'expo-router';
import { ArrowLeft, LockKeyhole, Mail, UserRoundPlus } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/components/Brand';
import { Body, Button, Card, Field, Screen, Title } from '@/components/ui';
import { hasSupabaseConfig } from '@/lib/config';
import { getSupabaseClient } from '@/lib/supabase';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type AuthMode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const profileComplete = useAppStore((state) => state.profile.onboardingComplete);

  const submit = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Account sync is not configured in this build. You can continue as a guest.');
      return;
    }
    if (!email.trim() || password.length < 8) {
      setMessage('Enter an email and a password with at least 8 characters.');
      return;
    }

    setLoading(true);
    setMessage(null);
    const credentials = { email: email.trim(), password };
    const result =
      authMode === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (authMode === 'sign-up' && !result.data.session) {
      setMessage('Check your email to confirm your account, then return here to sign in.');
      setAuthMode('sign-in');
      return;
    }
    router.replace(profileComplete ? '/(tabs)' : '/onboarding/goals');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}
    >
      <Screen>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.back}
        >
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <Brand />
        <View style={styles.intro}>
          <Title compact>{authMode === 'sign-in' ? 'Welcome back.' : 'Create your account.'}</Title>
          <Body muted>
            {authMode === 'sign-in'
              ? 'Sign in to sync your movement profile and workout history.'
              : 'Your camera feed and pose landmarks will still stay on this device.'}
          </Body>
        </View>
        {!hasSupabaseConfig ? (
          <Card tone="warning">
            <Text style={styles.messageTitle}>Guest build</Text>
            <Body muted>Supabase keys are not configured, so account sync is unavailable.</Body>
          </Card>
        ) : null}
        <View style={styles.form}>
          <View style={styles.labelRow}>
            <Mail color={colors.lavenderDark} size={18} />
            <Text style={styles.label}>Email</Text>
          </View>
          <Field
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
          <View style={styles.labelRow}>
            <LockKeyhole color={colors.lavenderDark} size={18} />
            <Text style={styles.label}>Password</Text>
          </View>
          <Field
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
          />
        </View>
        {message ? (
          <Card tone="warning">
            <Body>{message}</Body>
          </Card>
        ) : null}
        <Button
          disabled={!hasSupabaseConfig}
          {...(authMode === 'sign-up' ? { icon: UserRoundPlus } : {})}
          loading={loading}
          onPress={() => void submit()}
        >
          {authMode === 'sign-in' ? 'Sign in' : 'Create account'}
        </Button>
        <Button
          onPress={() => {
            setAuthMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
            setMessage(null);
          }}
          variant="quiet"
        >
          {authMode === 'sign-in' ? 'Need an account? Sign up' : 'Already a member? Sign in'}
        </Button>
        <Button
          onPress={() => router.replace(profileComplete ? '/(tabs)' : '/onboarding/goals')}
          variant="secondary"
        >
          Continue as guest
        </Button>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
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
  intro: { gap: spacing.sm, marginVertical: spacing.md },
  form: { gap: spacing.sm },
  labelRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  label: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14 },
  messageTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 16 },
});
