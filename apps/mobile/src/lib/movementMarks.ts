// shared chip colors so cards and collection headers don't drift.
import { colors } from '@/theme/tokens';
import type { Exercise } from '@/types';

// category chips, not compatibility. caution/incompatible live on the card copy.

export const movementMarkColors: Record<Exercise['category'], string> = {
  strength: colors.lavenderDark,
  mobility: colors.success,
  cardio: colors.danger,
  balance: colors.warning,
};

// soft fills so the mark stays readable on the cream canvas.
export const movementMarkBackgrounds: Record<Exercise['category'], string> = {
  strength: colors.lavenderSoft,
  mobility: colors.successSoft,
  cardio: colors.dangerSoft,
  balance: colors.warningSoft,
};
