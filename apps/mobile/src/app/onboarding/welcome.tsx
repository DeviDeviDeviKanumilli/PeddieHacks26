import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Image, StyleSheet, View } from 'react-native';
import { Brand } from '@/components/Brand';
import { Body, Button, Eyebrow, Screen, Title } from '@/components/ui';
import { welcomeIllustration } from '@/lib/exerciseVisuals';
import { colors, spacing } from '@/theme/tokens';

export default function WelcomeScreen() {
  return (
    <Screen scroll={false}>
      <Brand />
      <View style={styles.hero}>
        <Eyebrow>Movement, made yours</Eyebrow>
        <Title>Fitness that starts with what you can do.</Title>
        <Body muted>
          AdaptFit builds flexible routines around your goals, equipment, and available movement.
        </Body>
      </View>
      <View style={styles.illustrationFrame}>
        <Image
          accessibilityLabel="Three adults adapting movement with a dumbbell, resistance band, wheelchair, and prosthetic leg"
          resizeMode="contain"
          source={welcomeIllustration}
          style={styles.illustration}
        />
      </View>
      <Button icon={ArrowRight} onPress={() => router.push('/onboarding/goals')}>
        Build my movement profile
      </Button>
      <Button onPress={() => router.push('/auth/sign-in')} variant="quiet">
        I already have an account
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs },
  illustrationFrame: {
    backgroundColor: '#FFF9F1',
    borderColor: colors.line,
    borderRadius: 28,
    borderWidth: 1,
    height: 200,
    overflow: 'hidden',
  },
  illustration: { height: '100%', width: '100%' },
});
