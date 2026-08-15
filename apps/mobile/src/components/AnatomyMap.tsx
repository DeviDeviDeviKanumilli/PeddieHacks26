import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { muscleLabels } from '@/lib/anatomy';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { MuscleActivation, MuscleRegionId, RegionState } from '@/types';

type MovementRegionId =
  | 'shoulders'
  | 'arms'
  | 'upper-back'
  | 'lower-back'
  | 'core'
  | 'hips'
  | 'left-knee'
  | 'right-knee'
  | 'ankles';

type Shape = {
  id: MuscleRegionId;
  movementRegion: MovementRegionId;
  d: string;
  side: 'front' | 'back';
};

const shapes: Shape[] = [
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'front',
    d: 'M31 52 Q40 42 49 48 L46 65 Q36 65 31 58Z',
  },
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'front',
    d: 'M71 48 Q80 42 89 52 L89 58 Q84 65 74 65Z',
  },
  {
    id: 'chest',
    movementRegion: 'core',
    side: 'front',
    d: 'M47 52 Q60 46 73 52 L71 78 Q60 84 49 78Z',
  },
  {
    id: 'biceps',
    movementRegion: 'arms',
    side: 'front',
    d: 'M25 66 Q32 62 37 70 L31 105 Q24 105 21 97Z',
  },
  {
    id: 'biceps',
    movementRegion: 'arms',
    side: 'front',
    d: 'M83 70 Q88 62 95 66 L99 97 Q96 105 89 105Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'front',
    d: 'M21 101 Q27 105 31 107 L23 143 Q16 143 15 136Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'front',
    d: 'M89 107 Q93 105 99 101 L105 136 Q104 143 97 143Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M49 81 Q60 86 71 81 L70 124 Q60 132 50 124Z',
  },
  {
    id: 'hip-flexors',
    movementRegion: 'hips',
    side: 'front',
    d: 'M44 126 Q52 120 59 131 L54 151 Q45 149 42 139Z',
  },
  {
    id: 'hip-flexors',
    movementRegion: 'hips',
    side: 'front',
    d: 'M61 131 Q68 120 76 126 L78 139 Q75 149 66 151Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'left-knee',
    side: 'front',
    d: 'M41 148 Q52 146 56 155 L53 205 Q45 214 38 202Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'right-knee',
    side: 'front',
    d: 'M64 155 Q68 146 79 148 L82 202 Q75 214 67 205Z',
  },
  {
    id: 'calves',
    movementRegion: 'left-knee',
    side: 'front',
    d: 'M39 211 Q48 205 53 214 L50 258 Q42 265 37 253Z',
  },
  {
    id: 'calves',
    movementRegion: 'right-knee',
    side: 'front',
    d: 'M67 214 Q72 205 81 211 L83 253 Q78 265 70 258Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'front',
    d: 'M37 254 Q45 260 50 258 L54 274 L34 274Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'front',
    d: 'M70 258 Q75 260 83 254 L86 274 L66 274Z',
  },
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'back',
    d: 'M31 52 Q40 42 49 49 L46 67 Q36 65 31 58Z',
  },
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'back',
    d: 'M71 49 Q80 42 89 52 L89 58 Q84 65 74 67Z',
  },
  {
    id: 'upper-back',
    movementRegion: 'upper-back',
    side: 'back',
    d: 'M47 51 Q60 45 73 51 L72 92 Q60 103 48 92Z',
  },
  {
    id: 'triceps',
    movementRegion: 'arms',
    side: 'back',
    d: 'M25 66 Q33 62 37 70 L31 106 Q24 105 21 97Z',
  },
  {
    id: 'triceps',
    movementRegion: 'arms',
    side: 'back',
    d: 'M83 70 Q87 62 95 66 L99 97 Q96 105 89 106Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'back',
    d: 'M21 101 Q27 105 31 108 L23 143 Q16 143 15 136Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'back',
    d: 'M89 108 Q93 105 99 101 L105 136 Q104 143 97 143Z',
  },
  {
    id: 'lower-back',
    movementRegion: 'lower-back',
    side: 'back',
    d: 'M48 94 Q60 104 72 94 L70 126 Q60 133 50 126Z',
  },
  {
    id: 'glutes',
    movementRegion: 'hips',
    side: 'back',
    d: 'M42 127 Q52 119 59 131 L58 153 Q47 158 41 145Z',
  },
  {
    id: 'glutes',
    movementRegion: 'hips',
    side: 'back',
    d: 'M61 131 Q68 119 78 127 L79 145 Q73 158 62 153Z',
  },
  {
    id: 'hamstrings',
    movementRegion: 'left-knee',
    side: 'back',
    d: 'M41 153 Q51 148 57 157 L53 205 Q46 213 38 202Z',
  },
  {
    id: 'hamstrings',
    movementRegion: 'right-knee',
    side: 'back',
    d: 'M63 157 Q69 148 79 153 L82 202 Q74 213 67 205Z',
  },
  {
    id: 'calves',
    movementRegion: 'left-knee',
    side: 'back',
    d: 'M39 210 Q48 204 53 214 L50 258 Q42 265 37 253Z',
  },
  {
    id: 'calves',
    movementRegion: 'right-knee',
    side: 'back',
    d: 'M67 214 Q72 204 81 210 L83 253 Q78 265 70 258Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'back',
    d: 'M37 254 Q45 260 50 258 L54 274 L34 274Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'back',
    d: 'M70 258 Q75 260 83 254 L86 274 L66 274Z',
  },
];

const movementColors: Record<RegionState, string> = {
  neutral: '#DDE2E8',
  focus: colors.success,
  limited: '#D49A2B',
  avoid: '#E8685B',
};

const roleColors = {
  primary: colors.lavenderDark,
  secondary: '#3B9EA2',
  stabilizer: '#E58A66',
} as const;

const baseBody = (
  <>
    <Circle cx="60" cy="23" fill="#E8EBEF" r="17" stroke="#A7AFBA" strokeWidth="1.5" />
    <Path d="M52 38 L68 38 L70 48 L50 48Z" fill="#E8EBEF" stroke="#A7AFBA" strokeWidth="1.5" />
    <Path
      d="M35 51 Q60 38 85 51 L79 132 Q70 144 60 143 Q50 144 41 132Z"
      fill="#E8EBEF"
      stroke="#A7AFBA"
      strokeWidth="1.5"
    />
    <Path
      d="M34 56 Q24 58 20 70 L12 137 Q13 147 23 147 L34 105 L42 63Z"
      fill="#E8EBEF"
      stroke="#A7AFBA"
      strokeWidth="1.5"
    />
    <Path
      d="M86 56 Q96 58 100 70 L108 137 Q107 147 97 147 L86 105 L78 63Z"
      fill="#E8EBEF"
      stroke="#A7AFBA"
      strokeWidth="1.5"
    />
    <Path
      d="M42 128 Q50 139 58 145 L54 210 L50 273 L34 273 L36 207Z"
      fill="#E8EBEF"
      stroke="#A7AFBA"
      strokeWidth="1.5"
    />
    <Path
      d="M78 128 Q70 139 62 145 L66 210 L70 273 L86 273 L84 207Z"
      fill="#E8EBEF"
      stroke="#A7AFBA"
      strokeWidth="1.5"
    />
  </>
);

export function AnatomyMap({
  activations = [],
  movementStates,
  onMovementPress,
  compact = false,
  showLegend = true,
  showMuscleLabels = true,
}: {
  activations?: MuscleActivation[];
  movementStates?: Record<string, RegionState>;
  onMovementPress?: (id: MovementRegionId) => void;
  compact?: boolean;
  showLegend?: boolean;
  showMuscleLabels?: boolean;
}) {
  const activationById = new Map(activations.map((activation) => [activation.id, activation]));
  const interactive = Boolean(movementStates && onMovementPress);
  const fillFor = (shape: Shape): string => {
    if (movementStates) return movementColors[movementStates[shape.movementRegion] ?? 'neutral'];
    return activationById.has(shape.id)
      ? roleColors[activationById.get(shape.id)?.role ?? 'stabilizer']
      : '#DDE2E8';
  };
  return (
    <View style={styles.wrap}>
      <View style={[styles.canvas, compact && styles.canvasCompact]}>
        <Svg
          accessibilityLabel="Front and back muscle map"
          height="100%"
          viewBox="0 0 270 310"
          width="100%"
        >
          {(['front', 'back'] as const).map((side, figureIndex) => (
            <G key={side} transform={`translate(${figureIndex * 145 + 4} 13)`}>
              {baseBody}
              {shapes
                .filter((shape) => shape.side === side)
                .map((shape) => {
                  const activation = activationById.get(shape.id);
                  return (
                    <Path
                      d={shape.d}
                      fill={fillFor(shape)}
                      fillOpacity={activation ? 0.55 + activation.intensity * 0.09 : 0.92}
                      key={`${side}-${shape.id}-${shape.d}`}
                      {...(interactive
                        ? { onPress: () => onMovementPress?.(shape.movementRegion) }
                        : {})}
                      stroke="#FFFFFF"
                      strokeWidth="1.4"
                    />
                  );
                })}
              <SvgText fill={colors.muted} fontSize="10" textAnchor="middle" x="60" y="294">
                {side === 'front' ? 'FRONT' : 'BACK'}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>
      {showLegend ? (
        <View style={styles.legend}>
          {movementStates ? (
            (
              [
                ['focus', 'Focus'],
                ['limited', 'Limited'],
                ['avoid', 'Avoid'],
                ['neutral', 'Neutral'],
              ] as const
            ).map(([state, label]) => (
              <LegendItem color={movementColors[state]} key={state} label={label} />
            ))
          ) : activations.length > 0 ? (
            (
              [
                ['primary', 'Primary'],
                ['secondary', 'Supporting'],
                ['stabilizer', 'Stabilizing'],
              ] as const
            ).map(([role, label]) => (
              <LegendItem color={roleColors[role]} key={role} label={label} />
            ))
          ) : (
            <Text style={styles.empty}>Muscle emphasis will appear here.</Text>
          )}
        </View>
      ) : null}
      {!movementStates && activations.length > 0 && showMuscleLabels ? (
        <View style={styles.chips}>
          {activations.map((activation) => (
            <View key={activation.id} style={styles.chip}>
              <View style={[styles.dot, { backgroundColor: roleColors[activation.role] }]} />
              <Text style={styles.chipText}>{muscleLabels[activation.id]}</Text>
              <Text style={styles.intensity}>{activation.intensity}/5</Text>
            </View>
          ))}
        </View>
      ) : null}
      {interactive ? (
        <View accessible style={styles.tapHint}>
          <Text style={styles.tapHintText}>
            Tap a muscle region, or use the labeled controls below.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  canvas: {
    backgroundColor: '#F8F8FC',
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 360,
    overflow: 'hidden',
  },
  canvasCompact: { height: 280 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  legendText: { color: colors.muted, fontFamily: typography.medium, fontSize: 12 },
  dot: { borderRadius: 99, height: 10, width: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  chipText: { color: colors.ink, fontFamily: typography.semibold, fontSize: 12 },
  intensity: { color: colors.muted, fontFamily: typography.medium, fontSize: 11 },
  empty: { color: colors.muted, fontFamily: typography.body, fontSize: 13 },
  tapHint: { alignItems: 'center', minHeight: 32, justifyContent: 'center' },
  tapHintText: { color: colors.muted, fontFamily: typography.body, fontSize: 12 },
});
