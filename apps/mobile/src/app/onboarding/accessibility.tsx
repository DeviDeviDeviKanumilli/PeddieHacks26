import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Body, Button, Chip, Eyebrow, Screen, Title } from '@/components/ui';
import { accessibilityPreferences, selectionHaptic, speakFeedback } from '@/lib/accessibility';
import { useAppStore } from '@/state/useAppStore';
import { spacing } from '@/theme/tokens';

export default function AccessibilityScreen() {
  const selected = useAppStore((state) => state.profile.accessibility);
  const setAccessibility = useAppStore((state) => state.setAccessibility);
  const toggle = (item: (typeof accessibilityPreferences)[number]) => {
    const enabling = !selected.includes(item);
    const next = enabling ? [...selected, item] : selected.filter((value) => value !== item);
    setAccessibility(next);
    if (item === 'Haptic feedback' && enabling) void selectionHaptic();
    if (item === 'Spoken feedback' && enabling) speakFeedback('Spoken feedback on.');
  };
  return (
    <Screen>
      <OnboardingHeader step={5} />
      <View style={styles.intro}>
        <Eyebrow>Make it yours</Eyebrow>
        <Title compact>How should AdaptFit communicate?</Title>
        <Body muted>
          These preferences change presentation and feedback—not which exercises you are allowed to
          choose.
        </Body>
      </View>
      <View style={styles.choices}>
        {accessibilityPreferences.map((item) => (
          <Chip
            key={item}
            label={item}
            onPress={() => toggle(item)}
            selected={selected.includes(item)}
          />
        ))}
      </View>
      <Button icon={ArrowRight} onPress={() => router.push('/onboarding/summary')}>
        Review my profile
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm },
  choices: { gap: spacing.sm },
});
