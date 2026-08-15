import { router } from 'expo-router';
import { ArrowRight, Camera, HeartHandshake, SlidersHorizontal } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/components/Brand';
import { Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

const benefits = [
  {
    icon: SlidersHorizontal,
    title: 'Built around your movement',
    body: 'Choose what feels available, limited, or off-limits today.',
  },
  {
    icon: HeartHandshake,
    title: 'Adapt, don’t exclude',
    body: 'Every recommendation explains why it fits and what can change.',
  },
  {
    icon: Camera,
    title: 'Camera is always optional',
    body: 'Continue with timers and manual reps whenever tracking is not right for you.',
  },
];

export default function WelcomeScreen() {
  return (
    <Screen>
      <Brand />
      <View style={styles.hero}>
        <Eyebrow>Movement, made yours</Eyebrow>
        <Title>Fitness that starts with what you can do.</Title>
        <Body muted>
          AdaptFit builds flexible routines around your goals, equipment, and available movement.
        </Body>
      </View>
      <View style={styles.orbit}>
        <View style={styles.orbitInner}>
          <Text style={styles.orbitMark}>A</Text>
        </View>
        <View style={[styles.satellite, styles.satelliteOne]} />
        <View style={[styles.satellite, styles.satelliteTwo]} />
      </View>
      <View style={styles.benefits}>
        {benefits.map(({ icon: Icon, title, body }) => (
          <Card key={title} style={styles.benefit}>
            <View style={styles.iconWrap}>
              <Icon color={colors.lavenderDark} size={21} />
            </View>
            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>{title}</Text>
              <Text style={styles.benefitBody}>{body}</Text>
            </View>
          </Card>
        ))}
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
  hero: { gap: spacing.sm, marginTop: spacing.lg },
  orbit: { alignItems: 'center', height: 170, justifyContent: 'center' },
  orbitInner: {
    alignItems: 'center',
    backgroundColor: colors.lavenderDark,
    borderRadius: 52,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  orbitMark: { color: colors.surface, fontFamily: typography.displayItalic, fontSize: 58 },
  satellite: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.surface,
    borderRadius: 99,
    borderWidth: 4,
    height: 34,
    position: 'absolute',
    width: 34,
  },
  satelliteOne: { right: '23%', top: 16 },
  satelliteTwo: { backgroundColor: colors.successSoft, bottom: 14, left: '22%', width: 46 },
  benefits: { gap: spacing.sm },
  benefit: { alignItems: 'center', flexDirection: 'row', padding: spacing.md },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  benefitCopy: { flex: 1, gap: 2 },
  benefitTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 15 },
  benefitBody: { color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 18 },
});
