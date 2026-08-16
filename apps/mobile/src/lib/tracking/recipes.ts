import { ExerciseSetTracker, type LimbRule, RepCounter } from '@/lib/tracking/analyzer';

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
  secondaryLandmarks: Readonly<Record<TrackingLimbName, readonly [number, number, number]>>;
  limbRule: LimbRule;
  formAngleRange: { min: number; max: number };
  startCue: string;
  formCue: string;
  movementCue?: string;
  returnCue?: string;
  targetRangeOfMotionDeg: { min: number; max: number };
  targetTempoMs: { min: number; max: number };
};

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
  'seated-biceps-curl': {
    key: 'seated-biceps-curl-v1',
    slug: 'seated-biceps-curl',
    calibrated: true,
    limbs: curlLimbs(50, 145),
    secondaryLandmarks: { left: [23, 11, 13], right: [24, 12, 14] },
    limbRule: 'either',
    formAngleRange: { min: 140, max: 180 },
    startCue: 'Straighten your working arm and hold briefly',
    formCue: 'Keep your working elbow close to your side',
    targetRangeOfMotionDeg: { min: 90, max: 150 },
    targetTempoMs: { min: 1400, max: 6000 },
  },
  'seated-resistance-band-row': {
    key: 'seated-resistance-band-row-v1',
    slug: 'seated-resistance-band-row',
    calibrated: false,
    limbs: curlLimbs(75, 145),
    secondaryLandmarks: { left: [11, 23, 25], right: [12, 24, 26] },
    limbRule: 'either',
    formAngleRange: { min: 145, max: 180 },
    startCue: 'Extend your arms forward and hold briefly',
    formCue: 'Sit tall and keep your torso steady',
    targetRangeOfMotionDeg: { min: 65, max: 140 },
    targetTempoMs: { min: 1600, max: 6500 },
  },
  'seated-march': {
    key: 'seated-march-v1',
    slug: 'seated-march',
    calibrated: false,
    limbs: [
      {
        name: 'left',
        landmarkIndices: [11, 23, 25],
        targetAngleDegrees: 105,
        returnAngleDegrees: 150,
      },
      {
        name: 'right',
        landmarkIndices: [12, 24, 26],
        targetAngleDegrees: 105,
        returnAngleDegrees: 150,
      },
    ],
    secondaryLandmarks: { left: [23, 25, 27], right: [24, 26, 28] },
    limbRule: 'either',
    formAngleRange: { min: 55, max: 135 },
    startCue: 'Place both feet down and hold briefly',
    formCue: 'Lift the knee without leaning your torso',
    targetRangeOfMotionDeg: { min: 40, max: 110 },
    targetTempoMs: { min: 1200, max: 5000 },
  },
  'seated-knee-extension': {
    key: 'seated-knee-extension-v1',
    slug: 'seated-knee-extension',
    calibrated: true,
    limbs: hipLimbs(155, 105),
    secondaryLandmarks: { left: [11, 23, 25], right: [12, 24, 26] },
    limbRule: 'either',
    formAngleRange: { min: 65, max: 125 },
    startCue: 'Bend your knee to a comfortable start and hold briefly',
    formCue: 'Keep your thigh supported and your torso still',
    movementCue: 'Straighten your knee through a comfortable full range',
    returnCue: 'Leg extended—lower with control',
    targetRangeOfMotionDeg: { min: 45, max: 100 },
    targetTempoMs: { min: 1400, max: 6000 },
  },
  'sit-to-stand': {
    key: 'sit-to-stand-v1',
    slug: 'sit-to-stand',
    calibrated: false,
    limbs: hipLimbs(155, 105),
    secondaryLandmarks: { left: [11, 23, 25], right: [12, 24, 26] },
    limbRule: 'both',
    formAngleRange: { min: 145, max: 180 },
    startCue: 'Sit back fully and hold briefly',
    formCue: 'Stand tall, then sit back with control',
    targetRangeOfMotionDeg: { min: 45, max: 110 },
    targetTempoMs: { min: 2200, max: 8000 },
  },
  'wall-push-up': {
    key: 'wall-push-up-v1',
    slug: 'wall-push-up',
    calibrated: true,
    limbs: curlLimbs(95, 150),
    secondaryLandmarks: { left: [11, 23, 25], right: [12, 24, 26] },
    limbRule: 'either',
    formAngleRange: { min: 150, max: 180 },
    startCue: 'Straighten your arms and hold briefly',
    formCue: 'Keep a straight line from shoulders through hips',
    targetRangeOfMotionDeg: { min: 45, max: 110 },
    targetTempoMs: { min: 1500, max: 6500 },
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
  return new ExerciseSetTracker(limbCounters, 1, repsPerSet, 0, recipe.limbRule);
};

export const recipeLandmarkProps = (
  recipe: TrackingRecipe,
): {
  leftLandmarks: readonly [number, number, number];
  rightLandmarks: readonly [number, number, number];
  leftSecondaryLandmarks: readonly [number, number, number];
  rightSecondaryLandmarks: readonly [number, number, number];
} => {
  const left = recipe.limbs.find((limb) => limb.name === 'left');
  const right = recipe.limbs.find((limb) => limb.name === 'right');
  return {
    leftLandmarks: left?.landmarkIndices ?? [11, 13, 15],
    rightLandmarks: right?.landmarkIndices ?? [12, 14, 16],
    leftSecondaryLandmarks: recipe.secondaryLandmarks.left,
    rightSecondaryLandmarks: recipe.secondaryLandmarks.right,
  };
};
