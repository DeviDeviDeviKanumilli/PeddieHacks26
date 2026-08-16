import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, typography } from '@/theme/tokens';

// wordmark. svg is hidden because the text already says adaptfit.
export const Brand = ({ light = false }: { light?: boolean }) => (
  <View accessibilityLabel="AdaptFit" style={styles.brand}>
    <Svg accessibilityElementsHidden height={34} viewBox="0 0 40 40" width={34}>
      <Path d="M4 32 18 6h7L12 32H4Z" fill={light ? colors.surface : colors.lavenderDark} />
      <Path
        d="m16 32 9-17 11 17h-8l-3-5-3 5h-6Z"
        fill={light ? colors.lavenderSoft : colors.lavender}
      />
    </Svg>
    <Text style={[styles.name, light && styles.light]}>AdaptFit</Text>
  </View>
);

const styles = StyleSheet.create({
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  name: { color: colors.ink, fontFamily: typography.bold, fontSize: 20, letterSpacing: -0.5 },
  // light = dark chrome (session overlays). keep the mark readable on black.
  light: { color: colors.surface },
});
