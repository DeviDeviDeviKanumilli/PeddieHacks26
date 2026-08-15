import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { View } from 'react-native';
import { BodyMap } from '@/components/BodyMap';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Body, Button, Eyebrow, Screen, Title } from '@/components/ui';
import { useAppStore } from '@/state/useAppStore';
import { spacing } from '@/theme/tokens';

export default function MovementScreen() {
  const regions = useAppStore((state) => state.profile.regions);
  const setRegion = useAppStore((state) => state.setRegion);
  return (
    <Screen>
      <OnboardingHeader step={2} />
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Eyebrow>Your movement map</Eyebrow>
        <Title compact>Tell us what feels available today.</Title>
        <Body muted>
          Tap each region to cycle through focus, limited, avoid, and neutral. This is about
          preference and capability—not diagnosis.
        </Body>
      </View>
      <BodyMap onChange={setRegion} regions={regions} />
      <Button icon={ArrowRight} onPress={() => router.push('/onboarding/preferences')}>
        Continue
      </Button>
    </Screen>
  );
}
