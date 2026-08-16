import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Body, Button, Chip, Eyebrow, Screen, Title } from '@/components/ui';
import { equipment } from '@/data/catalog';
import { useAppStore } from '@/state/useAppStore';
import { spacing } from '@/theme/tokens';

export default function EquipmentScreen() {
  const selected = useAppStore((state) => state.profile.equipment);
  const setEquipment = useAppStore((state) => state.setEquipment);
  const toggle = (item: string) => {
    // "none" is exclusive. a chair is assumed so seated work still matches.
    if (item === 'None') return setEquipment(['None']);
    const withoutNone = selected.filter((value) => value !== 'None');
    setEquipment(
      withoutNone.includes(item)
        ? withoutNone.filter((value) => value !== item)
        : [...withoutNone, item],
    );
  };
  return (
    <Screen>
      <OnboardingHeader step={4} />
      {/* extra gear (wall, band) only enters generation if it's on this list. */}
      <View style={styles.intro}>
        <Eyebrow>Your setup</Eyebrow>
        <Title compact>What equipment is actually available?</Title>
        <Body muted>
          Recommendations will work with this list. A stable chair is assumed when you choose none.
          Extra gear like a wall or band is only used when you select it.
        </Body>
      </View>
      <View style={styles.choices}>
        {equipment.map((item) => (
          <Chip
            key={item}
            label={item}
            onPress={() => toggle(item)}
            selected={selected.includes(item)}
          />
        ))}
      </View>
      <Button icon={ArrowRight} onPress={() => router.push('/onboarding/accessibility')}>
        Continue
      </Button>
      {/* none is a valid complete choice — seated catalog still matches. */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm },
  choices: { gap: spacing.sm },
});
