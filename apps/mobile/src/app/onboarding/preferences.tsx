import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Body, Button, Card, Chip, Eyebrow, Screen, SectionHeading, Title } from '@/components/ui';
import { useAppStore } from '@/state/useAppStore';
import { spacing } from '@/theme/tokens';

const capabilities = [
  'Seated posture',
  'Standing',
  'Floor transfer',
  'Overhead reach',
  'Grip with left hand',
  'Grip with right hand',
  'Standing balance',
];

export default function PreferencesScreen() {
  const values = useAppStore((state) => state.profile.capabilities);
  const setCapability = useAppStore((state) => state.setCapability);
  return (
    <Screen>
      <OnboardingHeader step={3} />
      {/* only focus vs neutral here — not the four-state body map. */}
      <View style={styles.intro}>
        <Eyebrow>Movement preferences</Eyebrow>
        <Title compact>Which movement patterns feel available?</Title>
        <Body muted>
          Leave anything neutral if you are unsure. AdaptFit will favor known, comfortable options.
        </Body>
      </View>
      <Card>
        <SectionHeading title="Available movements" />
        <View style={styles.choices}>
          {capabilities.map((item) => {
            const id = item.toLowerCase().replaceAll(' ', '-');
            // store keys are slugs; labels stay human.
            const selected = values[id] === 'focus';
            return (
              <Chip
                key={id}
                label={item}
                onPress={() => setCapability(id, selected ? 'neutral' : 'focus')}
                selected={selected}
                tone="success"
              />
            );
          })}
        </View>
      </Card>
      <Button icon={ArrowRight} onPress={() => router.push('/onboarding/equipment')}>
        Continue
      </Button>
      {/* all-neutral is fine. generation just won't prefer these patterns. */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm },
  choices: { gap: spacing.sm },
});
