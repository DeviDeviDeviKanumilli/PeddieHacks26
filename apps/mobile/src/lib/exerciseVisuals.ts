import type { ImageSourcePropType } from 'react-native';
import type { ExerciseVisualKey } from '@/types';

export const exerciseVisuals: Record<ExerciseVisualKey, ImageSourcePropType> = {
  'seated-strength': require('../../assets/illustrations/seated-strength-flat.png'),
  'seated-pull': require('../../assets/illustrations/seated-band-row-flat.png'),
  'seated-mobility': require('../../assets/illustrations/seated-mobility-flat.png'),
  'wall-supported': require('../../assets/illustrations/wall-supported-flat.png'),
};

export const welcomeIllustration = require('../../assets/illustrations/welcome-inclusive-flat.png');
