import { colors } from '@/theme/tokens';
import type { Exercise } from '@/types';

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
