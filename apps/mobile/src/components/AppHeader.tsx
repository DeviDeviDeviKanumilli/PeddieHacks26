import { Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Brand } from '@/components/Brand';
import { colors, radii } from '@/theme/tokens';

export const AppHeader = () => (
  <View style={styles.header}>
    <Brand />
    <Pressable accessibilityLabel="Notifications" accessibilityRole="button" style={styles.action}>
      <Bell color={colors.ink} size={20} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
