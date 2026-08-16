import { ExerciseSetTracker, RepCounter } from '@/lib/tracking/analyzer';

export type TrackingLimbName = 'left' | 'right';

export type TrackingLimb = {
  name: TrackingLimbName;
  landmarkIndices: readonly [number, number, number];
  targetAngleDegrees: number;
  returnAngleDegrees: number;
};

export type TrackingRecipe = {
  key: string;
  slug: string;
  calibrated: boolean;
  limbs: readonly TrackingLimb[];
};

// mediapipe pose: 11-13-15 left elbow, 12-14-16 right elbow.
const curlLimbs = (
  targetAngleDegrees: number,
  returnAngleDegrees: number,
): readonly TrackingLimb[] => [
  {
    name: 'left',
    landmarkIndices: [11, 13, 15],
    targetAngleDegrees,
    returnAngleDegrees,
  },
  {
    name: 'right',
    landmarkIndices: [12, 14, 16],
    targetAngleDegrees,
    returnAngleDegrees,
  },
];

// 23-25-27 left hip/knee, 24-26-28 right. used for marches and sit-to-stand.
const hipLimbs = (
  targetAngleDegrees: number,
  returnAngleDegrees: number,
): readonly TrackingLimb[] => [
  {
    name: 'left',
    landmarkIndices: [23, 25, 27],
    targetAngleDegrees,
    returnAngleDegrees,
  },
  {
    name: 'right',
    landmarkIndices: [24, 26, 28],
    targetAngleDegrees,
    returnAngleDegrees,
  },
];

const TRACKING_RECIPES: Record<string, TrackingRecipe> = {
  // android-first calibrated recipe. do not treat the others as accepted yet.
  'seated-biceps-curl': {
    key: 'seated-biceps-curl-v1',
    slug: 'seated-biceps-curl',
    calibrated: true,
    limbs: curlLimbs(40, 160),
  },
  'seated-resistance-band-row': {
    key: 'seated-resistance-band-row-v1',
    slug: 'seated-resistance-band-row',
    calibrated: false,
    limbs: curlLimbs(70, 150),
  },
  'seated-march': {
    key: 'seated-march-v1',
    slug: 'seated-march',
    calibrated: false,
    limbs: hipLimbs(100, 160),
  },
  'seated-knee-extension': {
    key: 'seated-knee-extension-v1',
    slug: 'seated-knee-extension',
    calibrated: false,
    // target is the straighter knee; return is the seated flex.
    limbs: hipLimbs(160, 70),
  },
  'sit-to-stand': {
    key: 'sit-to-stand-v1',
    slug: 'sit-to-stand',
    calibrated: false,
    limbs: hipLimbs(160, 90),
  },
  'wall-push-up': {
    key: 'wall-push-up-v1',
    slug: 'wall-push-up',
    calibrated: false,
    limbs: curlLimbs(70, 150),
  },
};

export const getTrackingRecipe = (slug: string): TrackingRecipe | undefined =>
  TRACKING_RECIPES[slug];

export const getCalibratedRecipe = (slug: string): TrackingRecipe | undefined => {
  const recipe = TRACKING_RECIPES[slug];
  return recipe?.calibrated === true ? recipe : undefined;
};

export const createSetTracker = (
  recipe: TrackingRecipe,
  repsPerSet: number,
): ExerciseSetTracker => {
  const limbCounters: Record<string, RepCounter> = {};
  for (const limb of recipe.limbs) {
    limbCounters[limb.name] = new RepCounter(
      limb.landmarkIndices,
      limb.targetAngleDegrees,
      limb.returnAngleDegrees,
    );
  }
  // session screen tracks one set at a time; rest lives in the rest route.
  return new ExerciseSetTracker(limbCounters, 1, repsPerSet, 0);
};

export const recipeLandmarkProps = (
  recipe: TrackingRecipe,
): {
  leftLandmarks: readonly [number, number, number];
  rightLandmarks: readonly [number, number, number];
} => {
  const left = recipe.limbs.find((limb) => limb.name === 'left');
  const right = recipe.limbs.find((limb) => limb.name === 'right');
  // curl joints if a recipe is missing a side. never send a full pose skeleton.
  return {
    leftLandmarks: left?.landmarkIndices ?? [11, 13, 15],
    rightLandmarks: right?.landmarkIndices ?? [12, 14, 16],
  };
};
