import { Accessibility, Dumbbell, HeartPulse, type LucideIcon, Scale } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { movementMarkBackgrounds, movementMarkColors } from '@/lib/movementMarks';
import { radii } from '@/theme/tokens';
import type { Exercise } from '@/types';

const icons: Record<Exercise['category'], LucideIcon> = {
  strength: Dumbbell,
  mobility: Accessibility,
  cardio: HeartPulse,
  balance: Scale,
};

export const MovementMark = ({
  category,
  size = 64,
  tone = category,
}: {
  category: Exercise['category'];
  size?: number;
  tone?: Exercise['category'];
}) => {
  const Icon = icons[category];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.mark,
        {
          backgroundColor: movementMarkBackgrounds[tone],
          borderRadius: size >= 60 ? radii.md : radii.sm,
          height: size,
          width: size,
        },
      ]}
    >
      <Icon color={movementMarkColors[tone]} size={Math.round(size * 0.48)} strokeWidth={2} />
    </View>
  );
};

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center' },
});
