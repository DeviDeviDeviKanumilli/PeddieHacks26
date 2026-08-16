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

const outline = '#A9A9B2';
const bodyFill = '#BDBDC5';
const inactiveFill = '#D5D5DB';
const gutter = '#FCFBFD';

/**
 * A connected standing figure. The body is assembled from overlapping anatomical
 * base pieces, then muscle contours are layered over it. This keeps the map readable
 * at small sizes without turning it into a jointed mannequin or a flat screenshot.
 */
const bodyPieces = [
  // Head and neck.
  'M60 4 C50 4 43 12 43 22 C43 31 49 38 60 40 C71 38 77 31 77 22 C77 12 70 4 60 4Z',
  'M52 35 C54 41 55 45 51 49 L60 55 L69 49 C65 45 66 41 68 35 C65 38 63 39 60 40 C57 39 55 38 52 35Z',
  // Torso and pelvis.
  'M48 44 C40 44 33 49 28 58 C31 70 35 88 37 105 C38 119 43 132 50 141 L60 148 L70 141 C77 132 82 119 83 105 C85 88 89 70 92 58 C87 49 80 44 72 44 L67 49 C65 53 55 53 53 49Z',
  'M42 119 C47 116 54 119 60 126 C66 119 73 116 78 119 C80 128 76 139 70 147 L60 154 L50 147 C44 139 40 128 42 119Z',
  // Arms, including small hands.
  'M30 51 C23 54 19 61 18 72 L12 112 C11 119 14 124 19 125 C23 124 25 119 26 113 L33 81 C36 68 36 57 30 51Z',
  'M90 51 C97 54 101 61 102 72 L108 112 C109 119 106 124 101 125 C97 124 95 119 94 113 L87 81 C84 68 84 57 90 51Z',
  'M17 119 C12 120 9 124 10 129 L14 138 C16 142 20 142 21 138 L18 132 L22 137 C24 139 27 136 25 133 L21 126 C20 122 19 120 17 119Z',
  'M103 119 C108 120 111 124 110 129 L106 138 C104 142 100 142 99 138 L102 132 L98 137 C96 139 93 136 95 133 L99 126 C100 122 101 120 103 119Z',
  // Legs and feet.
  'M44 141 C38 151 37 164 39 179 L42 215 C43 227 40 247 38 267 C37 275 42 280 49 281 L54 277 L55 248 L58 214 L60 154 C55 147 50 143 44 141Z',
  'M76 141 C82 151 83 164 81 179 L78 215 C77 227 80 247 82 267 C83 275 78 280 71 281 L66 277 L65 248 L62 214 L60 154 C65 147 70 143 76 141Z',
  'M39 265 C35 270 31 278 33 283 C38 287 48 287 55 283 L54 276 C49 279 44 277 39 273Z',
  'M81 265 C85 270 89 278 87 283 C82 287 72 287 65 283 L66 276 C71 279 76 277 81 273Z',
] as const;

const frontShapes: Shape[] = [
  // Shoulders and chest.
  {
    id: 'traps',
    movementRegion: 'upper-back',
    side: 'front',
    d: 'M51 43 C54 40 57 40 60 44 C63 40 66 40 69 43 L67 55 L60 61 L53 55Z',
  },
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'front',
    d: 'M29 48 C35 44 43 46 47 53 L43 66 C36 68 29 62 27 56Z',
  },
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'front',
    d: 'M91 48 C85 44 77 46 73 53 L77 66 C84 68 91 62 93 56Z',
  },
  {
    id: 'chest',
    movementRegion: 'core',
    side: 'front',
    d: 'M45 51 C50 48 56 49 59 54 L59 70 C53 74 47 71 43 65Z',
  },
  {
    id: 'chest',
    movementRegion: 'core',
    side: 'front',
    d: 'M75 51 C70 48 64 49 61 54 L61 70 C67 74 73 71 77 65Z',
  },
  // Arms.
  {
    id: 'biceps',
    movementRegion: 'arms',
    side: 'front',
    d: 'M25 61 C30 56 36 58 38 66 L34 87 C31 93 25 91 22 84 L23 70Z',
  },
  {
    id: 'biceps',
    movementRegion: 'arms',
    side: 'front',
    d: 'M95 61 C90 56 84 58 82 66 L86 87 C89 93 95 91 98 84 L97 70Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'front',
    d: 'M22 87 C27 84 34 87 34 94 L29 115 C26 121 20 118 18 112 L20 96Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'front',
    d: 'M98 87 C93 84 86 87 86 94 L91 115 C94 121 100 118 102 112 L100 96Z',
  },
  // Obliques and six-pack.
  {
    id: 'obliques',
    movementRegion: 'core',
    side: 'front',
    d: 'M38 70 C42 67 47 70 48 77 L47 103 C44 108 39 104 37 96 L36 78Z',
  },
  {
    id: 'obliques',
    movementRegion: 'core',
    side: 'front',
    d: 'M82 70 C78 67 73 70 72 77 L73 103 C76 108 81 104 83 96 L84 78Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M49 73 C52 71 56 72 59 74 L59 84 C56 87 52 87 49 84Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M61 74 C64 72 68 71 71 73 L71 84 C68 87 64 87 61 84Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M49 87 C52 85 56 85 59 87 L59 98 C56 101 52 101 49 98Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M61 87 C64 85 68 85 71 87 L71 98 C68 101 64 101 61 98Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M49 101 C52 99 56 99 59 101 L59 112 C56 115 52 115 49 112Z',
  },
  {
    id: 'core',
    movementRegion: 'core',
    side: 'front',
    d: 'M61 101 C64 99 68 99 71 101 L71 112 C68 115 64 115 61 112Z',
  },
  // Hips and quads.
  {
    id: 'hip-flexors',
    movementRegion: 'hips',
    side: 'front',
    d: 'M40 108 C46 104 54 108 58 116 L54 132 C48 131 42 125 39 118Z',
  },
  {
    id: 'hip-flexors',
    movementRegion: 'hips',
    side: 'front',
    d: 'M80 108 C74 104 66 108 62 116 L66 132 C72 131 78 125 81 118Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'left-knee',
    side: 'front',
    d: 'M40 139 C45 135 51 137 55 145 L53 174 C50 181 44 182 40 176 L38 151Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'left-knee',
    side: 'front',
    d: 'M47 140 C52 140 57 147 58 155 L56 176 C53 180 50 178 48 173Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'right-knee',
    side: 'front',
    d: 'M80 139 C75 135 69 137 65 145 L67 174 C70 181 76 182 80 176 L82 151Z',
  },
  {
    id: 'quadriceps',
    movementRegion: 'right-knee',
    side: 'front',
    d: 'M73 140 C68 140 63 147 62 155 L64 176 C67 180 70 178 72 173Z',
  },
  {
    id: 'calves',
    movementRegion: 'left-knee',
    side: 'front',
    d: 'M40 178 C44 175 49 177 50 184 L49 216 C46 223 41 222 38 216 L38 191Z',
  },
  {
    id: 'calves',
    movementRegion: 'left-knee',
    side: 'front',
    d: 'M50 180 C54 177 58 181 58 188 L56 216 C53 222 50 220 49 215Z',
  },
  {
    id: 'calves',
    movementRegion: 'right-knee',
    side: 'front',
    d: 'M80 178 C76 175 71 177 70 184 L71 216 C74 223 79 222 82 216 L82 191Z',
  },
  {
    id: 'calves',
    movementRegion: 'right-knee',
    side: 'front',
    d: 'M70 180 C66 177 62 181 62 188 L64 216 C67 222 70 220 71 215Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'front',
    d: 'M39 264 C42 260 48 261 52 266 L53 278 C48 280 43 278 39 274Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'front',
    d: 'M81 264 C78 260 72 261 68 266 L67 278 C72 280 77 278 81 274Z',
  },
];

const backShapes: Shape[] = [
  // Upper and middle back.
  {
    id: 'traps',
    movementRegion: 'upper-back',
    side: 'back',
    d: 'M52 43 C55 39 58 40 60 44 C62 40 65 39 68 43 L73 55 L60 73 L47 55Z',
  },
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'back',
    d: 'M29 48 C35 44 43 46 47 53 L43 66 C36 68 29 62 27 56Z',
  },
  {
    id: 'shoulders',
    movementRegion: 'shoulders',
    side: 'back',
    d: 'M91 48 C85 44 77 46 73 53 L77 66 C84 68 91 62 93 56Z',
  },
  {
    id: 'lats',
    movementRegion: 'upper-back',
    side: 'back',
    d: 'M40 59 C46 56 53 63 56 78 L53 106 C47 104 41 97 39 84Z',
  },
  {
    id: 'lats',
    movementRegion: 'upper-back',
    side: 'back',
    d: 'M80 59 C74 56 67 63 64 78 L67 106 C73 104 79 97 81 84Z',
  },
  {
    id: 'upper-back',
    movementRegion: 'upper-back',
    side: 'back',
    d: 'M55 59 L60 69 L65 59 L65 96 L60 105 L55 96Z',
  },
  {
    id: 'lower-back',
    movementRegion: 'lower-back',
    side: 'back',
    d: 'M48 99 L59 91 L59 119 L45 115Z',
  },
  {
    id: 'lower-back',
    movementRegion: 'lower-back',
    side: 'back',
    d: 'M61 91 L72 99 L75 115 L61 119Z',
  },
  // Rear arms.
  {
    id: 'triceps',
    movementRegion: 'arms',
    side: 'back',
    d: 'M25 61 C30 56 36 58 38 66 L34 87 C31 93 25 91 22 84 L23 70Z',
  },
  {
    id: 'triceps',
    movementRegion: 'arms',
    side: 'back',
    d: 'M95 61 C90 56 84 58 82 66 L86 87 C89 93 95 91 98 84 L97 70Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'back',
    d: 'M22 87 C27 84 34 87 34 94 L29 115 C26 121 20 118 18 112 L20 96Z',
  },
  {
    id: 'forearms',
    movementRegion: 'arms',
    side: 'back',
    d: 'M98 87 C93 84 86 87 86 94 L91 115 C94 121 100 118 102 112 L100 96Z',
  },
  // Glutes and hamstrings.
  {
    id: 'glutes',
    movementRegion: 'hips',
    side: 'back',
    d: 'M40 111 C46 107 54 110 58 118 L55 137 C49 142 42 137 39 128Z',
  },
  {
    id: 'glutes',
    movementRegion: 'hips',
    side: 'back',
    d: 'M80 111 C74 107 66 110 62 118 L65 137 C71 142 78 137 81 128Z',
  },
  {
    id: 'hamstrings',
    movementRegion: 'left-knee',
    side: 'back',
    d: 'M40 140 C45 136 52 139 56 147 L53 176 C50 182 44 181 40 175 L38 151Z',
  },
  {
    id: 'hamstrings',
    movementRegion: 'left-knee',
    side: 'back',
    d: 'M47 141 C52 141 57 148 58 156 L56 177 C53 181 50 179 48 174Z',
  },
  {
    id: 'hamstrings',
    movementRegion: 'right-knee',
    side: 'back',
    d: 'M80 140 C75 136 68 139 64 147 L67 176 C70 182 76 181 80 175 L82 151Z',
  },
  {
    id: 'hamstrings',
    movementRegion: 'right-knee',
    side: 'back',
    d: 'M73 141 C68 141 63 148 62 156 L64 177 C67 181 70 179 72 174Z',
  },
  {
    id: 'calves',
    movementRegion: 'left-knee',
    side: 'back',
    d: 'M40 178 C44 175 49 177 50 184 L49 216 C46 223 41 222 38 216 L38 191Z',
  },
  {
    id: 'calves',
    movementRegion: 'left-knee',
    side: 'back',
    d: 'M50 180 C54 177 58 181 58 188 L56 216 C53 222 50 220 49 215Z',
  },
  {
    id: 'calves',
    movementRegion: 'right-knee',
    side: 'back',
    d: 'M80 178 C76 175 71 177 70 184 L71 216 C74 223 79 222 82 216 L82 191Z',
  },
  {
    id: 'calves',
    movementRegion: 'right-knee',
    side: 'back',
    d: 'M70 180 C66 177 62 181 62 188 L64 216 C67 222 70 220 71 215Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'back',
    d: 'M39 264 C42 260 48 261 52 266 L53 278 C48 280 43 278 39 274Z',
  },
  {
    id: 'ankles-feet',
    movementRegion: 'ankles',
    side: 'back',
    d: 'M81 264 C78 260 72 261 68 266 L67 278 C72 280 77 278 81 274Z',
  },
];

const shapes = [...frontShapes, ...backShapes];

const muscleHighlightIds: Partial<Record<MuscleRegionId, MuscleRegionId[]>> = {
  traps: ['traps', 'upper-back'],
  lats: ['lats', 'upper-back'],
  obliques: ['obliques', 'core'],
};

const movementColors: Record<RegionState, string> = {
  neutral: bodyFill,
  focus: colors.success,
  limited: '#D49A2B',
  avoid: '#E8685B',
};

const roleColors = {
  primary: colors.lavenderDark,
  secondary: colors.lavender,
  stabilizer: '#B8B3DE',
} as const;

const BaseDetails = ({ side }: { side: 'front' | 'back' }) => (
  <>
    <Path
      d="M52 42 C55 45 57 47 60 48 C63 47 65 45 68 42"
      fill="none"
      stroke={gutter}
      strokeWidth="1.7"
    />
    {side === 'back' ? (
      <Path
        d="M60 70 L60 139"
        fill="none"
        stroke={gutter}
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    ) : null}
  </>
);

export function AnatomyMap({
  activations = [],
  movementStates,
  onMovementPress,
  compact = false,
  showLegend = true,
  showMuscleLabels = true,
  showCanvas = true,
}: {
  activations?: MuscleActivation[];
  movementStates?: Record<string, RegionState>;
  onMovementPress?: (id: MovementRegionId) => void;
  compact?: boolean;
  showLegend?: boolean;
  showMuscleLabels?: boolean;
  showCanvas?: boolean;
}) {
  const activationById = new Map(activations.map((activation) => [activation.id, activation]));
  const interactive = Boolean(movementStates && onMovementPress);
  const activationFor = (id: MuscleRegionId): MuscleActivation | undefined => {
    for (const candidate of muscleHighlightIds[id] ?? [id]) {
      const found = activationById.get(candidate);
      if (found) return found;
    }
    return undefined;
  };
  const fillFor = (shape: Shape): string => {
    if (movementStates) return movementColors[movementStates[shape.movementRegion] ?? 'neutral'];
    const activation = activationFor(shape.id);
    return activation ? roleColors[activation.role] : inactiveFill;
  };
  const opacityFor = (shape: Shape) => {
    if (movementStates) return 1;
    const activation = activationFor(shape.id);
    return activation ? 0.72 + activation.intensity * 0.05 : 0.98;
  };

  return (
    <View style={styles.wrap}>
      {showCanvas ? (
        <View style={[styles.canvas, compact && styles.canvasCompact]}>
          <Svg
            accessibilityLabel="Front and back muscle map"
            height="100%"
            viewBox="0 0 270 318"
            width="100%"
          >
            {(['front', 'back'] as const).map((side, figureIndex) => (
              <G key={side} transform={`translate(${figureIndex * 138 + 8} 7)`}>
                {bodyPieces.map((d, index) => (
                  <Path
                    d={d}
                    fill={bodyFill}
                    key={`${side}-base-${d}`}
                    stroke={outline}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeWidth={index === 0 ? 1.2 : 1.05}
                  />
                ))}
                <BaseDetails side={side} />
                {shapes
                  .filter((shape) => shape.side === side)
                  .map((shape) => (
                    <Path
                      d={shape.d}
                      fill={fillFor(shape)}
                      fillOpacity={opacityFor(shape)}
                      key={`${side}-${shape.id}-${shape.d}`}
                      {...(interactive
                        ? { onPress: () => onMovementPress?.(shape.movementRegion) }
                        : {})}
                      stroke={gutter}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeWidth="1.7"
                    />
                  ))}
                <SvgText fill={colors.muted} fontSize="10" textAnchor="middle" x="60" y="304">
                  {side === 'front' ? 'FRONT' : 'BACK'}
                </SvgText>
              </G>
            ))}
          </Svg>
        </View>
      ) : null}
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
    backgroundColor: '#F4F3F8',
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 380,
    overflow: 'hidden',
  },
  canvasCompact: { height: 300 },
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
