import { router } from 'expo-router';
import { Check, Dumbbell, Goal, PersonStanding } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { useAppStore } from '@/state/useAppStore';
import { colors, spacing, typography } from '@/theme/tokens';

export default function SummaryScreen() {
  const profile = useAppStore((state) => state.profile);
  const complete = useAppStore((state) => state.completeOnboarding);
  const constrained = Object.values(profile.regions).filter(
    (state) => state === 'avoid' || state === 'limited',
  ).length;
  const finish = () => {
    complete();
    router.replace('/(tabs)');
  };
  return (
    <Screen>
      <OnboardingHeader step={6} />
      <View style={styles.intro}>
        <Eyebrow>Your starting point</Eyebrow>
        <Title compact>A profile built around today—not forever.</Title>
        <Body muted>
          AdaptFit will use this to explain recommendations. Update it whenever your movement
          changes.
        </Body>
      </View>
      <Card tone="lavender">
        <SummaryRow
          icon={Goal}
          label="Goals"
          value={profile.goals.join(', ') || 'General fitness'}
        />
        <SummaryRow
          icon={PersonStanding}
          label="Movement considerations"
          value={`${constrained} marked region${constrained === 1 ? '' : 's'}`}
        />
        <SummaryRow icon={Dumbbell} label="Equipment" value={profile.equipment.join(', ')} />
      </Card>
      <Card tone="success">
        <View style={styles.ready}>
          <Check color={colors.success} size={24} />
          <Text style={styles.readyTitle}>Your first recommendations are ready</Text>
        </View>
        <Body muted>
          Nothing here is a medical assessment. Stop for sharp pain, dizziness, or unexpected
          symptoms.
        </Body>
      </Card>
      <Button icon={Check} onPress={finish}>
        Enter AdaptFit
      </Button>
    </Screen>
  );
}

const SummaryRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Goal;
  label: string;
  value: string;
}) => (
  <View style={styles.row}>
    <Icon color={colors.lavenderDark} size={22} />
    <View style={styles.rowCopy}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  intro: { gap: spacing.sm, marginTop: spacing.md },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowCopy: { flex: 1, gap: 2 },
  label: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  value: { color: colors.ink, fontFamily: typography.semibold, fontSize: 16 },
  ready: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  readyTitle: { color: colors.ink, flex: 1, fontFamily: typography.semibold, fontSize: 17 },
});
