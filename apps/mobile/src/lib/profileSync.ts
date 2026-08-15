import type {
  MovementProfile as ApiMovementProfile,
  SettingsPatch,
  UpdateMovementProfileRequest,
} from '@peddie/contracts';
import { mobileApi } from '@/lib/api';
import type { MovementProfile, RegionState } from '@/types';

type CapabilityState = 'unknown' | 'available' | 'limited' | 'avoid';

const regionIds: Record<string, string> = {
  shoulders: 'shoulders',
  arms: 'upper_arms',
  'upper-back': 'upper_back',
  'lower-back': 'lower_back',
  core: 'torso',
  hips: 'hips',
  'left-knee': 'left_knee',
  'right-knee': 'right_knee',
  ankles: 'ankles_feet',
};

const capabilityIds: Record<string, string> = {
  'seated-posture': 'seated_posture',
  standing: 'standing',
  'floor-transfer': 'floor_transfer',
  'overhead-reach': 'overhead_reach',
  'grip-with-left-hand': 'left_grip',
  'grip-with-right-hand': 'right_grip',
  'standing-balance': 'standing_balance',
};

const equipmentIds: Record<string, string> = {
  'Stable chair': 'stable-chair',
  Wall: 'wall',
  Dumbbells: 'dumbbells',
  'Resistance band': 'resistance_band',
  'Exercise mat': 'exercise-mat',
};

const goalIds: Record<string, string> = {
  'Build strength': 'strength',
  'Improve mobility': 'mobility',
  'Increase endurance': 'cardio',
  'Improve balance': 'balance',
  'General fitness': 'strength',
  'Return to movement': 'mobility',
};

const capabilityState = (value: RegionState): CapabilityState => {
  if (value === 'focus') return 'available';
  if (value === 'neutral') return 'unknown';
  return value;
};

const remap = <T>(
  values: Readonly<Record<string, RegionState>>,
  ids: Readonly<Record<string, string>>,
  mapValue: (value: RegionState) => T,
): Record<string, T> =>
  Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => {
      const target = ids[key];
      return target ? [[target, mapValue(value)]] : [];
    }),
  );

export const movementProfileRequest = (
  profile: MovementProfile,
  expectedVersion: number,
): UpdateMovementProfileRequest => ({
  expectedVersion,
  bodyRegions: remap(profile.regions, regionIds, (value) => value),
  capabilities: remap(profile.capabilities, capabilityIds, capabilityState),
  equipmentIds: [...new Set(profile.equipment.flatMap((item) => equipmentIds[item] ?? []))],
  goalIds: [...new Set(profile.goals.flatMap((item) => goalIds[item] ?? []))],
  intensityPreference: 'standard',
});

export const settingsPatch = (profile: MovementProfile): SettingsPatch => {
  const selected = new Set(profile.accessibility);
  return {
    accessibilityPreferences: {
      reducedMotion: selected.has('Reduced motion'),
      highContrast: selected.has('High contrast'),
      largerText: selected.has('Larger text'),
    },
    feedbackPreferences: {
      spokenFeedback: selected.has('Spoken feedback'),
      hapticFeedback: selected.has('Haptic feedback'),
      visualFeedback: true,
    },
  };
};

export const syncMovementProfile = async (
  profile: MovementProfile,
): Promise<ApiMovementProfile> => {
  const current = await mobileApi.getMovementProfile();
  const updated = await mobileApi.putMovementProfile(
    movementProfileRequest(profile, current.version),
  );
  await mobileApi.patchSettings(settingsPatch(profile));
  return updated;
};
