import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Body, Button, Chip, Eyebrow, Screen, Title } from '@/components/ui';
import { goals } from '@/data/catalog';
import { useAppStore } from '@/state/useAppStore';
import { spacing } from '@/theme/tokens';

export default function GoalsScreen() {
  const selected = useAppStore((state) => state.profile.goals);
  const setGoals = useAppStore((state) => state.setGoals);
  const toggle = (goal: string) =>
    setGoals(
      selected.includes(goal) ? selected.filter((item) => item !== goal) : [...selected, goal],
    );
  // at least one goal or generation has nothing to rank against.
  return (
    <Screen>
      <OnboardingHeader step={1} />
      {/* header replace-backs to welcome so the wizard doesn't pile duplicate steps. */}
      <View style={styles.intro}>
        <Eyebrow>Your direction</Eyebrow>
        <Title compact>What would you like movement to support?</Title>
        <Body muted>
          Choose as many as feel useful. You can change these whenever your priorities shift.
        </Body>
      </View>
      <View style={styles.choices}>
        {goals.map((goal) => (
          <Chip
            key={goal}
            label={goal}
            onPress={() => toggle(goal)}
            selected={selected.includes(goal)}
          />
        ))}
      </View>
      <Button
        disabled={selected.length === 0}
        icon={ArrowRight}
        onPress={() => router.push('/onboarding/movement')}
      >
        Continue
      </Button>
      {/* empty goals would make "why this plan" and generation look broken. */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm },
  choices: { gap: spacing.sm },
});
