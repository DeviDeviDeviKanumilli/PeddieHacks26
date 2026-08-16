import { Bell } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Brand } from '@/components/Brand';
import { AccessiblePressable } from '@/components/ui';
import { colors } from '@/theme/tokens';

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
      <Bell accessibilityElementsHidden color={colors.ink} size={22} />
    </AccessiblePressable>
  </View>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
});
