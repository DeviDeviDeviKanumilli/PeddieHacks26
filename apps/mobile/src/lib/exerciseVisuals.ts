import type { ImageSourcePropType } from 'react-native';
import type { ExerciseVisualKey } from '@/types';

// bundled illustrations only. never fetch exercise photos or user media.
export const exerciseVisuals: Record<ExerciseVisualKey, ImageSourcePropType> = {
  'seated-strength': require('../../assets/illustrations/seated-strength-flat.png'),
  'seated-pull': require('../../assets/illustrations/seated-band-row-flat.png'),
  'seated-mobility': require('../../assets/illustrations/seated-mobility-flat.png'),
  'wall-supported': require('../../assets/illustrations/wall-supported-flat.png'),
};

// onboarding hero; kept next to the exercise art so asset paths stay in one place.
export const welcomeIllustration = require('../../assets/illustrations/welcome-inclusive-flat.png');
// keep require() here so metro bundles the png; a uri would fetch at runtime.
