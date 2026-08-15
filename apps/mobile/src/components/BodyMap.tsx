import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { bodyRegions } from '@/data/catalog';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { RegionState } from '@/types';

const stateColor: Record<RegionState, string> = {
  neutral: colors.neutral,
  focus: colors.success,
  limited: colors.warning,
  avoid: colors.danger,
};

const markers = [
  { id: 'shoulders', x: 90, y: 68 },
  { id: 'arms', x: 54, y: 104 },
  { id: 'upper-back', x: 90, y: 96 },
  { id: 'lower-back', x: 90, y: 132 },
  { id: 'core', x: 90, y: 120 },
  { id: 'hips', x: 90, y: 151 },
  { id: 'left-knee', x: 72, y: 210 },
  { id: 'right-knee', x: 108, y: 210 },
  { id: 'ankles', x: 90, y: 270 },
] as const;

const nextState = (state: RegionState): RegionState => {
  if (state === 'neutral') return 'focus';
  if (state === 'focus') return 'limited';
  if (state === 'limited') return 'avoid';
  return 'neutral';
};

export const BodyMap = ({
  regions,
  onChange,
}: {
  regions: Record<string, RegionState>;
  onChange: (id: string, state: RegionState) => void;
}) => (
  <View style={styles.wrap}>
    <View style={styles.figure} accessible={false}>
      <Svg height={300} viewBox="0 0 180 300" width={180}>
        <Circle cx="90" cy="30" fill={colors.lavenderSoft} r="20" stroke={colors.ink} />
        <Rect
          fill={colors.lavenderSoft}
          height="105"
          rx="30"
          stroke={colors.ink}
          width="72"
          x="54"
          y="52"
        />
        <Rect
          fill={colors.lavenderSoft}
          height="105"
          rx="12"
          stroke={colors.ink}
          width="22"
          x="24"
          y="64"
        />
        <Rect
          fill={colors.lavenderSoft}
          height="105"
          rx="12"
          stroke={colors.ink}
          width="22"
          x="134"
          y="64"
        />
        <Rect
          fill={colors.lavenderSoft}
          height="128"
          rx="15"
          stroke={colors.ink}
          width="28"
          x="56"
          y="150"
        />
        <Rect
          fill={colors.lavenderSoft}
          height="128"
          rx="15"
          stroke={colors.ink}
          width="28"
          x="96"
          y="150"
        />
        <Line stroke={colors.lavender} strokeDasharray="4 5" x1="90" x2="90" y1="58" y2="150" />
        {markers.map((marker) => {
          const state = regions[marker.id] ?? 'neutral';
          return (
            <Circle
              cx={marker.x}
              cy={marker.y}
              fill={stateColor[state]}
              key={marker.id}
              r="8"
              stroke={colors.surface}
              strokeWidth="3"
            />
          );
        })}
      </Svg>
    </View>
    <View style={styles.legend}>
      {(['focus', 'limited', 'avoid', 'neutral'] as const).map((state) => (
        <View key={state} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: stateColor[state] }]} />
          <Text style={styles.legendText}>{state}</Text>
        </View>
      ))}
    </View>
    <View accessibilityLabel="Body region controls" style={styles.regionList}>
      {bodyRegions.map((region) => {
        const state = regions[region.id] ?? 'neutral';
        return (
          <Pressable
            accessibilityHint="Cycles through focus, limited, avoid, and neutral"
            accessibilityLabel={`${region.label}: ${state}`}
            accessibilityRole="button"
            key={region.id}
            onPress={() => onChange(region.id, nextState(state))}
            style={styles.regionButton}
          >
            <View style={[styles.dot, { backgroundColor: stateColor[state] }]} />
            <Text style={styles.regionLabel}>{region.label}</Text>
            <Text style={styles.regionState}>{state}</Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  figure: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  dot: { borderRadius: 99, height: 10, width: 10 },
  legendText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  regionList: { gap: spacing.xs },
  regionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  regionLabel: { color: colors.ink, flex: 1, fontFamily: typography.medium, fontSize: 15 },
  regionState: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    textTransform: 'capitalize',
  },
});
