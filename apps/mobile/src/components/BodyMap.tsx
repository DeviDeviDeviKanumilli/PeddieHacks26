import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnatomyMap } from '@/components/AnatomyMap';
import { bodyRegions } from '@/data/catalog';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { RegionState } from '@/types';

const stateColor: Record<RegionState, string> = {
  neutral: '#DDE2E8',
  focus: colors.success,
  limited: '#D49A2B',
  avoid: '#E8685B',
};

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
}) => {
  const cycle = (id: string) => onChange(id, nextState(regions[id] ?? 'neutral'));
  return (
    <View style={styles.wrap}>
      <AnatomyMap movementStates={regions} onMovementPress={cycle} />
      <View accessibilityLabel="Body region controls" style={styles.regionList}>
        {bodyRegions.map((region) => {
          const state = regions[region.id] ?? 'neutral';
          return (
            <Pressable
              accessibilityHint="Cycles through focus, limited, avoid, and neutral"
              accessibilityLabel={`${region.label}: ${state}`}
              accessibilityRole="button"
              key={region.id}
              onPress={() => cycle(region.id)}
              style={({ pressed }) => [styles.regionButton, pressed && styles.pressed]}
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
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  regionList: { gap: spacing.xs },
  regionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  pressed: { opacity: 0.72 },
  dot: { borderRadius: 99, height: 11, width: 11 },
  regionLabel: { color: colors.ink, flex: 1, fontFamily: typography.medium, fontSize: 15 },
  regionState: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
