import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
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
  // Front: smaller repeated paths create recognisable anatomical divisions while
  // retaining one stable region ID for interaction and exercise data.
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'front',
    d: 'M27 58 C32 49 41 47 48 52 L46 66 C38 67 31 64 27 58Z',
  },
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'front',
    d: 'M72 52 C79 47 88 49 93 58 C89 64 82 67 74 66Z',
  },
  {
    id: 'chest',
    movementRegion: 'core',
    side: 'front',
    d: 'M47 52 C51 49 56 49 59 52 L59 75 C53 80 47 77 43 72 L43 59Z',
  },
  {
    id: 'chest',
    movementRegion: 'core',
    side: 'front',
    d: 'M61 52 C64 49 69 49 73 52 L77 59 L77 72 C73 77 67 80 61 75Z',
  },
  {
    id: 'biceps',
    movementRegion: 'arms',
    side: 'front',
    d: 'M21 66 C26 61 33 64 35 72 L31 98 C28 104 21 103 18 97Z',
  },
  {
    id: 'biceps',
    movementRegion: 'arms',
    side: 'front',
    d: 'M85 72 C87 64 94 61 99 66 L102 97 C99 103 92 104 89 98Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'front',
    d: 'M18 99 C22 103 27 105 31 101 L23 130 C21 137 14 139 11 133Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'front',
    d: 'M89 101 C93 105 98 103 102 99 L109 133 C106 139 99 137 97 130Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M44 75 C48 79 53 81 59 79 L59 92 L48 92Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M61 79 C67 81 72 79 76 75 L72 92 L61 92Z',
  },
  { id: 'core', movementRegion: 'core', side: 'front', d: 'M48 94 L59 94 L59 107 L47 107Z' },
  { id: 'core', movementRegion: 'core', side: 'front', d: 'M61 94 L72 94 L73 107 L61 107Z' },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M47 109 L59 109 L59 124 C54 126 49 123 46 119Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M61 109 L73 109 L74 119 C71 123 66 126 61 124Z',
  },
  {
    id: 'hip-flexors',
    movementRegion: 'hips',
    side: 'front',
    d: 'M40 122 C47 119 54 124 59 130 L55 149 C47 146 42 140 39 132Z',
  },
  {
    id: 'hip-flexors',
    movementRegion: 'hips',
    side: 'front',
    d: 'M61 130 C66 124 73 119 80 122 L81 132 C78 140 73 146 65 149Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'left-knee',
    side: 'front',
    d: 'M39 145 C45 143 51 147 55 154 L52 198 C49 207 42 207 37 199Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'left-knee',
    side: 'front',
    d: 'M56 153 C59 163 58 181 53 201 C50 192 49 169 50 153Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'right-knee',
    side: 'front',
    d: 'M65 154 C69 147 75 143 81 145 L83 199 C78 207 71 207 68 198Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'right-knee',
    side: 'front',
    d: 'M64 153 C70 169 70 192 67 201 C62 181 61 163 64 153Z',
  },
  {
    id: 'calves',
    movementRegion: 'left-knee',
    side: 'front',
    d: 'M38 207 C43 202 50 204 52 211 L50 253 C46 261 39 259 36 251Z',
  },
  {
    id: 'calves',
    movementRegion: 'right-knee',
    side: 'front',
    d: 'M68 211 C70 204 77 202 82 207 L84 251 C81 259 74 261 70 253Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'front',
    d: 'M36 251 C40 258 46 260 50 254 L53 272 L33 272Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'front',
    d: 'M70 254 C74 260 80 258 84 251 L87 272 L67 272Z',
  },

  // Back.
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'back',
    d: 'M27 58 C32 49 41 47 48 52 L46 67 C38 67 31 64 27 58Z',
  },
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'back',
    d: 'M72 52 C79 47 88 49 93 58 C89 64 82 67 74 67Z',
  },
  {
    id: 'upper-back',
    movementRegion: 'upper-back',
    side: 'back',
    d: 'M48 51 C52 47 56 45 60 45 C64 45 68 47 72 51 L67 72 L60 82 L53 72Z',
  },
  {
    id: 'upper-back',
    movementRegion: 'upper-back',
    side: 'back',
    d: 'M46 65 C51 71 55 77 59 83 L52 101 C45 94 41 82 42 69Z',
  },
  {
    id: 'upper-back',
    movementRegion: 'upper-back',
    side: 'back',
    d: 'M74 65 C79 82 75 94 68 101 L61 83 C65 77 69 71 74 65Z',
  },
  {
    id: 'triceps',
    movementRegion: 'arms',
    side: 'back',
    d: 'M21 66 C26 61 33 64 35 72 L31 99 C27 104 21 102 18 97Z',
  },
  {
    id: 'triceps',
    movementRegion: 'arms',
    side: 'back',
    d: 'M85 72 C87 64 94 61 99 66 L102 97 C99 102 93 104 89 99Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'back',
    d: 'M18 99 C22 103 27 105 31 101 L23 130 C21 137 14 139 11 133Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'back',
    d: 'M89 101 C93 105 98 103 102 99 L109 133 C106 139 99 137 97 130Z',
  },
  {
    id: 'lower-back',
    movementRegion: 'lower-back',
    side: 'back',
    d: 'M52 100 L59 84 L59 123 C54 126 49 121 46 116Z',
  },
  {
    id: 'lower-back',
    movementRegion: 'lower-back',
    side: 'back',
    d: 'M61 84 L68 100 L74 116 C71 121 66 126 61 123Z',
  },
  {
    id: 'glutes',
    movementRegion: 'hips',
    side: 'back',
    d: 'M40 121 C49 118 56 123 59 131 L57 151 C48 157 40 149 38 138Z',
  },
  {
    id: 'glutes',
    movementRegion: 'hips',
    side: 'back',
    d: 'M61 131 C64 123 71 118 80 121 L82 138 C80 149 72 157 63 151Z',
  },
  {
    id: 'hamstrings',
    movementRegion: 'left-knee',
    side: 'back',
    d: 'M39 149 C46 145 53 149 57 157 L52 201 C48 208 41 206 37 199Z',
  },
  {
    id: 'hamstrings',
    movementRegion: 'right-knee',
    side: 'back',
    d: 'M63 157 C67 149 74 145 81 149 L83 199 C79 206 72 208 68 201Z',
  },
  {
    id: 'calves',
    movementRegion: 'left-knee',
    side: 'back',
    d: 'M38 207 C42 201 49 203 52 211 L49 251 C45 260 38 258 35 250Z',
  },
  {
    id: 'calves',
    movementRegion: 'right-knee',
    side: 'back',
    d: 'M68 211 C71 203 78 201 82 207 L85 250 C82 258 75 260 71 251Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'back',
    d: 'M35 250 C39 258 45 260 49 252 L53 272 L33 272Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'back',
    d: 'M71 252 C75 260 81 258 85 250 L87 272 L67 272Z',
  },
];

const movementColors: Record<RegionState, string> = {
  neutral: '#BDBCC0',
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
    <Path
      d="M60 3 C49 3 43 11 43 22 C43 31 47 37 53 41 L52 47 L68 47 L67 41 C73 37 77 31 77 22 C77 11 71 3 60 3Z"
      fill="#B8B7BA"
      stroke="#96959B"
      strokeWidth="1.35"
    />
    <Path
      d="M52 42 C55 46 57 48 60 48 C63 48 65 46 68 42 L70 51 L50 51Z"
      fill="#B8B7BA"
      stroke="#F8F7F8"
      strokeWidth="1.2"
    />
    <Path
      d="M48 48 C40 48 32 51 27 57 C25 67 30 84 35 96 L39 124 C42 135 50 142 60 143 C70 142 78 135 81 124 L85 96 C90 84 95 67 93 57 C88 51 80 48 72 48 C68 47 64 48 60 50 C56 48 52 47 48 48Z"
      fill="#B8B7BA"
      stroke="#96959B"
      strokeWidth="1.35"
    />
    <Path
      d="M30 55 C22 57 18 64 17 75 L9 124 C7 132 8 139 13 143 C17 144 21 139 23 132 L35 83 C38 70 37 60 30 55Z"
      fill="#B8B7BA"
      stroke="#96959B"
      strokeWidth="1.35"
    />
    <Path
      d="M90 55 C98 57 102 64 103 75 L111 124 C113 132 112 139 107 143 C103 144 99 139 97 132 L85 83 C82 70 83 60 90 55Z"
      fill="#B8B7BA"
      stroke="#96959B"
      strokeWidth="1.35"
    />
    <Path
      d="M13 138 C10 141 8 145 9 151 L11 158 L13 151 L15 162 L17 151 L19 160 L20 149 L22 155 L23 145 L21 137Z"
      fill="#B8B7BA"
      stroke="#96959B"
      strokeWidth="1.05"
    />
    <Path
      d="M107 138 C110 141 112 145 111 151 L109 158 L107 151 L105 162 L103 151 L101 160 L100 149 L98 155 L97 145 L99 137Z"
      fill="#B8B7BA"
      stroke="#96959B"
      strokeWidth="1.05"
    />
    <Path
      d="M40 122 C35 132 35 142 38 151 L36 198 C34 211 35 236 35 253 L32 272 C37 276 45 277 52 273 L51 256 L54 211 L58 150 C57 141 51 129 40 122Z"
      fill="#B8B7BA"
      stroke="#96959B"
      strokeWidth="1.35"
    />
    <Path
      d="M80 122 C85 132 85 142 82 151 L84 198 C86 211 85 236 85 253 L88 272 C83 276 75 277 68 273 L69 256 L66 211 L62 150 C63 141 69 129 80 122Z"
      fill="#B8B7BA"
      stroke="#96959B"
      strokeWidth="1.35"
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
              {side === 'back' ? (
                <Path
                  d="M60 47 C59 69 59 95 60 124"
                  fill="none"
                  stroke="#F8F7F8"
                  strokeLinecap="round"
                  strokeWidth="1.1"
                />
              ) : null}
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
                      stroke="#F8F7F8"
                      strokeLinejoin="round"
                      strokeWidth="1.25"
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
