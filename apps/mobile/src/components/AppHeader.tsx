import { Bell } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Brand } from '@/components/Brand';
import { AccessiblePressable } from '@/components/ui';
import { colors } from '@/theme/tokens';

// tab chrome. bell is a 44pt target; notifications aren't wired yet.
export const AppHeader = () => (
  <View style={styles.header}>
    <Brand />
    <AccessiblePressable
      accessibilityHint="Opens notifications"
      accessibilityLabel="Notifications"
      accessibilityRole="button"
      hitSlop={12}
      style={styles.action}
    >
      {/* extra hit slop so the 44pt box is easy to hit next to the wordmark. */}
      <Bell accessibilityElementsHidden color={colors.ink} size={22} />
    </AccessiblePressable>
  </View>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  // 44pt square. hit slop on the pressable is extra reach, not extra paint.
});
