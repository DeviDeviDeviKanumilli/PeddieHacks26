import type { ImageSourcePropType } from 'react-native';
import { colors } from '@/theme/tokens';
import type { Exercise } from '@/types';

export const movementMarks: Record<Exercise['category'], ImageSourcePropType> = {
  strength: require('../../assets/movement-marks/strength.png'),
  mobility: require('../../assets/movement-marks/mobility.png'),
  cardio: require('../../assets/movement-marks/cardio.png'),
  balance: require('../../assets/movement-marks/balance.png'),
};

export const movementMarkColors: Record<Exercise['category'], string> = {
  strength: colors.lavenderDark,
  mobility: colors.success,
  cardio: colors.danger,
  balance: colors.warning,
};

export const movementMarkBackgrounds: Record<Exercise['category'], string> = {
  strength: colors.lavenderSoft,
  mobility: colors.successSoft,
  cardio: colors.dangerSoft,
  balance: colors.warningSoft,
};
