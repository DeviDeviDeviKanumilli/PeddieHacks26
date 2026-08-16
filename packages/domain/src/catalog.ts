// in-memory catalog used by tests and generation. ids are stable uuids, not random.
// keep this list aligned with supabase/seed.sql. 24 rows, same ids, same tracking keys.
import type {
  BodyDemand,
  CapabilityDemand,
  EquipmentOption,
  ExerciseCandidate,
  ExercisePrescription,
} from './types.js';

// tiny builders so the table below stays readable. they do not validate ids against a registry.
const body = (
  regionId: string,
  involvement: BodyDemand['involvement'],
  demand: BodyDemand['demand'],
): BodyDemand => ({ regionId, involvement, demand });

const capability = (
  capabilityId: string,
  demand: CapabilityDemand['demand'],
  required: boolean,
): CapabilityDemand => ({ capabilityId, demand, required });

const required = (equipmentId: string, orGroup?: string): EquipmentOption =>
  orGroup === undefined
    ? { equipmentId, mode: 'required' }
    : { equipmentId, mode: 'required', orGroup }; // same orGroup = pick one of these, not all

const optional = (equipmentId: string): EquipmentOption => ({ equipmentId, mode: 'optional' });
// never fails compatibility. ranking may still prefer a shorter required list.

interface ExerciseInput {
  // write shape. omitted difficulty, prescription, and equipment get defaults in exercise().
  readonly id: string;
  readonly slug: string;
  readonly familyKey: string;
  readonly name: string;
  readonly category: ExerciseCandidate['category'];
  readonly position: ExerciseCandidate['position'];
  readonly difficulty?: ExerciseCandidate['difficulty'];
  readonly defaultPrescription?: ExercisePrescription;
  readonly estimatedSecondsPerSet?: number;
  readonly bodyDemands: readonly BodyDemand[];
  readonly capabilityDemands: readonly CapabilityDemand[];
  readonly equipmentOptions?: readonly EquipmentOption[];
  readonly primaryRegionIds: readonly string[];
  readonly goalIds: readonly string[];
  readonly trackingProfileKey?: string;
}

const exercise = (input: ExerciseInput): ExerciseCandidate => {
  const base: ExerciseCandidate = {
    id: input.id,
    slug: input.slug,
    familyKey: input.familyKey,
    name: input.name,
    category: input.category,
    position: input.position,
    difficulty: input.difficulty ?? 1, // omitted means easiest. low intensity still accepts 1-2.
    active: true, // curated rows stay active. retire by deleting, not by flipping this here.
    defaultPrescription: input.defaultPrescription ?? { sets: 2, reps: 10, restSeconds: 45 },
    estimatedSecondsPerSet: input.estimatedSecondsPerSet ?? 45, // generation uses this, not a live timer.
    bodyDemands: input.bodyDemands,
    capabilityDemands: input.capabilityDemands,
    equipmentOptions: input.equipmentOptions ?? [],
    primaryRegionIds: input.primaryRegionIds,
    goalIds: input.goalIds,
  };

  return input.trackingProfileKey === undefined
    ? base
    : { ...base, trackingProfileKey: input.trackingProfileKey }; // omit the key instead of sending undefined
};

const id = (number: number): string =>
  `00000000-0000-4000-8000-${number.toString().padStart(12, '0')}`; // deterministic so seed sql can match

export const CURATED_EXERCISES: readonly ExerciseCandidate[] = [
  // first few have tracking keys. later ones are still valid, just manual-count.
  exercise({
    id: id(1),
    slug: 'seated-biceps-curl',
    familyKey: 'elbow-flexion',
    name: 'Seated biceps curl',
    category: 'strength',
    position: 'seated',
    bodyDemands: [
      body('upper_arms', 'primary', 'moderate'),
      body('elbows', 'secondary', 'moderate'),
    ],
    capabilityDemands: [
      capability('seated_posture', 'moderate', true),
      capability('left_grip', 'moderate', true),
      capability('right_grip', 'moderate', true),
    ],
    equipmentOptions: [
      required('dumbbells', 'curl-load'),
      required('resistance_band', 'curl-load'), // either load is enough. do not require both.
    ],
    primaryRegionIds: ['upper_arms'],
    goalIds: ['upper_body', 'strength'],
    trackingProfileKey: 'seated-biceps-curl-v1',
  }),
  exercise({
    id: id(2),
    slug: 'seated-resistance-band-row',
    familyKey: 'horizontal-pull',
    name: 'Seated resistance-band row',
    category: 'strength',
    position: 'seated',
    bodyDemands: [
      body('upper_back', 'primary', 'high'),
      body('shoulders', 'secondary', 'moderate'),
    ],
    capabilityDemands: [
      capability('seated_posture', 'moderate', true),
      capability('left_grip', 'moderate', true),
      capability('right_grip', 'moderate', true),
    ],
    equipmentOptions: [required('resistance_band')],
    primaryRegionIds: ['upper_back'],
    goalIds: ['upper_body', 'strength'],
    trackingProfileKey: 'seated-resistance-band-row-v1',
  }),
  exercise({
    id: id(3),
    slug: 'seated-march', // no equipment row on purpose. empty options means nothing required.
    familyKey: 'hip-flexion',
    name: 'Seated march',
    category: 'cardio',
    position: 'seated',
    bodyDemands: [body('hips', 'primary', 'moderate'), body('thighs', 'secondary', 'moderate')],
    capabilityDemands: [capability('seated_posture', 'moderate', true)],
    primaryRegionIds: ['hips'],
    goalIds: ['lower_body', 'cardio'],
    trackingProfileKey: 'seated-march-v1',
  }),
  exercise({
    id: id(4),
    slug: 'seated-knee-extension',
    familyKey: 'knee-extension',
    name: 'Seated knee extension',
    category: 'strength',
    position: 'seated',
    bodyDemands: [body('knees', 'primary', 'high'), body('thighs', 'secondary', 'moderate')],
    capabilityDemands: [capability('seated_posture', 'moderate', true)],
    equipmentOptions: [optional('ankle-weight')], // extra load only. the movement is still valid without it.
    primaryRegionIds: ['knees'],
    goalIds: ['lower_body', 'strength'],
    trackingProfileKey: 'seated-knee-extension-v1',
  }),
  exercise({
    id: id(5),
    slug: 'sit-to-stand',
    familyKey: 'squat-pattern',
    name: 'Sit-to-stand',
    category: 'strength',
    position: 'standing',
    difficulty: 2,
    bodyDemands: [body('hips', 'primary', 'high'), body('knees', 'primary', 'high')],
    capabilityDemands: [
      capability('standing', 'high', true),
      capability('left_lower_body_weight_bearing', 'high', true),
      capability('right_lower_body_weight_bearing', 'high', true),
    ],
    equipmentOptions: [required('stable-chair')], // start position, not optional support.
    primaryRegionIds: ['hips', 'knees'],
    goalIds: ['lower_body', 'strength', 'balance'],
    trackingProfileKey: 'sit-to-stand-v1',
  }),
  exercise({
    id: id(6),
    slug: 'wall-push-up',
    familyKey: 'horizontal-push',
    name: 'Wall push-up',
    category: 'strength',
    position: 'standing',
    difficulty: 2,
    bodyDemands: [body('shoulders', 'primary', 'high'), body('upper_arms', 'secondary', 'high')],
    capabilityDemands: [
      capability('standing', 'moderate', true),
      capability('left_upper_body_weight_bearing', 'moderate', true),
      capability('right_upper_body_weight_bearing', 'moderate', true),
    ],
    equipmentOptions: [required('wall')], // wall is equipment here so a home without one fails cleanly.
    primaryRegionIds: ['shoulders'],
    goalIds: ['upper_body', 'strength'],
    trackingProfileKey: 'wall-push-up-v1',
  }),
  exercise({
    id: id(7),
    slug: 'seated-shoulder-press', // no tracking key: overhead press is manual-count in v1.
    familyKey: 'vertical-push',
    name: 'Seated shoulder press',
    category: 'strength',
    position: 'seated',
    difficulty: 2,
    bodyDemands: [
      body('shoulders', 'primary', 'high'),
      body('upper_arms', 'secondary', 'moderate'),
    ],
    capabilityDemands: [
      capability('seated_posture', 'moderate', true),
      capability('overhead_reach', 'high', true),
      capability('left_grip', 'moderate', true),
      capability('right_grip', 'moderate', true),
    ],
    equipmentOptions: [
      required('dumbbells', 'press-load'),
      required('resistance_band', 'press-load'),
    ],
    primaryRegionIds: ['shoulders'],
    goalIds: ['upper_body', 'strength'],
  }),
  exercise({
    id: id(8),
    slug: 'seated-front-raise',
    familyKey: 'shoulder-flexion',
    name: 'Seated front raise',
    category: 'strength',
    position: 'seated',
    bodyDemands: [
      body('shoulders', 'primary', 'moderate'),
      body('upper_arms', 'secondary', 'moderate'),
    ],
    capabilityDemands: [capability('seated_posture', 'moderate', true)],
    equipmentOptions: [optional('dumbbells')],
    primaryRegionIds: ['shoulders'],
    goalIds: ['upper_body', 'strength'],
  }),
  exercise({
    id: id(9),
    slug: 'seated-side-reach',
    familyKey: 'lateral-reach',
    name: 'Seated side reach',
    category: 'mobility',
    position: 'seated',
    bodyDemands: [body('torso', 'primary', 'moderate'), body('shoulders', 'secondary', 'minimal')],
    capabilityDemands: [capability('seated_posture', 'moderate', true)],
    primaryRegionIds: ['torso'],
    goalIds: ['mobility', 'core'],
  }),
  exercise({
    id: id(10),
    slug: 'seated-torso-rotation',
    familyKey: 'torso-rotation',
    name: 'Seated torso rotation',
    category: 'mobility',
    position: 'seated',
    bodyDemands: [
      body('torso', 'primary', 'moderate'),
      body('lower_back', 'secondary', 'moderate'),
    ],
    capabilityDemands: [
      capability('seated_posture', 'moderate', true),
      capability('torso_rotation', 'moderate', true),
    ],
    primaryRegionIds: ['torso'],
    goalIds: ['mobility', 'core'],
  }),
  exercise({
    id: id(11),
    slug: 'seated-heel-raise',
    familyKey: 'plantar-flexion',
    name: 'Seated heel raise',
    category: 'strength',
    position: 'seated',
    bodyDemands: [
      body('lower_legs', 'primary', 'moderate'),
      body('ankles_feet', 'secondary', 'moderate'),
    ],
    capabilityDemands: [capability('seated_posture', 'minimal', true)],
    primaryRegionIds: ['lower_legs'],
    goalIds: ['lower_body', 'strength'],
  }),
  exercise({
    id: id(12),
    slug: 'seated-toe-tap',
    familyKey: 'ankle-dorsiflexion',
    name: 'Seated toe tap',
    category: 'cardio',
    position: 'seated',
    bodyDemands: [body('ankles_feet', 'primary', 'moderate'), body('hips', 'secondary', 'minimal')],
    capabilityDemands: [capability('seated_posture', 'minimal', true)],
    primaryRegionIds: ['ankles_feet'],
    goalIds: ['lower_body', 'cardio'],
  }),
  exercise({
    id: id(13),
    slug: 'standing-supported-hip-abduction',
    familyKey: 'hip-abduction',
    name: 'Standing supported hip abduction',
    category: 'strength',
    position: 'standing',
    difficulty: 2,
    bodyDemands: [body('hips', 'primary', 'high'), body('thighs', 'secondary', 'moderate')],
    capabilityDemands: [
      capability('standing', 'moderate', true),
      capability('standing_balance', 'moderate', false),
      capability('left_single_leg_balance', 'moderate', false),
      capability('right_single_leg_balance', 'moderate', false),
    ],
    equipmentOptions: [required('stable-chair', 'support'), required('wall', 'support')], // chair or wall, not both
    primaryRegionIds: ['hips'],
    goalIds: ['lower_body', 'balance', 'strength'],
  }),
  exercise({
    id: id(14),
    slug: 'standing-supported-hip-extension',
    familyKey: 'hip-extension',
    name: 'Standing supported hip extension',
    category: 'strength',
    position: 'standing',
    difficulty: 2,
    bodyDemands: [body('hips', 'primary', 'high'), body('lower_back', 'stabilizing', 'minimal')],
    capabilityDemands: [
      capability('standing', 'moderate', true),
      capability('standing_balance', 'moderate', false), // optional: they can hold the chair
    ],
    equipmentOptions: [required('stable-chair', 'support'), required('wall', 'support')],
    primaryRegionIds: ['hips'],
    goalIds: ['lower_body', 'strength'],
  }),
  exercise({
    id: id(15),
    slug: 'supported-calf-raise',
    familyKey: 'standing-plantar-flexion',
    name: 'Supported calf raise',
    category: 'strength',
    position: 'standing',
    difficulty: 2,
    bodyDemands: [
      body('lower_legs', 'primary', 'high'),
      body('ankles_feet', 'secondary', 'moderate'),
    ],
    capabilityDemands: [
      capability('standing', 'moderate', true),
      capability('standing_balance', 'moderate', false),
    ],
    equipmentOptions: [required('stable-chair', 'support'), required('wall', 'support')],
    primaryRegionIds: ['lower_legs'],
    goalIds: ['lower_body', 'balance', 'strength'],
  }),
  exercise({
    id: id(16),
    slug: 'chair-supported-mini-squat',
    familyKey: 'supported-squat',
    name: 'Chair-supported mini squat',
    category: 'strength',
    position: 'standing',
    difficulty: 2,
    bodyDemands: [body('hips', 'primary', 'high'), body('knees', 'primary', 'high')],
    capabilityDemands: [
      capability('standing', 'high', true),
      capability('left_lower_body_weight_bearing', 'moderate', true),
      capability('right_lower_body_weight_bearing', 'moderate', true),
    ],
    equipmentOptions: [required('stable-chair')],
    primaryRegionIds: ['hips', 'knees'],
    goalIds: ['lower_body', 'strength'],
  }),
  exercise({
    id: id(17),
    slug: 'wall-shoulder-slide',
    familyKey: 'scapular-mobility',
    name: 'Wall shoulder slide',
    category: 'mobility',
    position: 'standing',
    bodyDemands: [
      body('shoulders', 'primary', 'moderate'),
      body('upper_back', 'secondary', 'moderate'),
    ],
    capabilityDemands: [
      capability('standing', 'moderate', true),
      capability('overhead_reach', 'moderate', true),
    ],
    equipmentOptions: [required('wall')],
    primaryRegionIds: ['shoulders', 'upper_back'],
    goalIds: ['upper_body', 'mobility'],
  }),
  exercise({
    id: id(18),
    slug: 'seated-band-chest-press',
    familyKey: 'horizontal-push', // same family as wall push-up. generation tries not to stack these.
    name: 'Seated resistance-band chest press',
    category: 'strength',
    position: 'seated',
    difficulty: 2,
    bodyDemands: [
      body('shoulders', 'primary', 'moderate'),
      body('upper_arms', 'secondary', 'moderate'),
    ],
    capabilityDemands: [
      capability('seated_posture', 'moderate', true),
      capability('left_grip', 'moderate', true),
      capability('right_grip', 'moderate', true),
    ],
    equipmentOptions: [required('resistance_band')],
    primaryRegionIds: ['shoulders'],
    goalIds: ['upper_body', 'strength'],
  }),
  exercise({
    id: id(19),
    slug: 'seated-ankle-pump',
    familyKey: 'ankle-pump',
    name: 'Seated ankle pump',
    category: 'mobility',
    position: 'seated',
    bodyDemands: [
      body('ankles_feet', 'primary', 'minimal'),
      body('lower_legs', 'secondary', 'minimal'),
    ],
    capabilityDemands: [capability('seated_posture', 'minimal', true)],
    primaryRegionIds: ['ankles_feet'],
    goalIds: ['lower_body', 'mobility'],
  }),
  exercise({
    id: id(20),
    slug: 'seated-glute-squeeze', // low seated demand. useful when standing and floor are off the table.
    familyKey: 'hip-isometric',
    name: 'Seated glute squeeze',
    category: 'strength',
    position: 'seated',
    bodyDemands: [body('hips', 'primary', 'moderate'), body('thighs', 'secondary', 'minimal')],
    capabilityDemands: [capability('seated_posture', 'minimal', true)],
    primaryRegionIds: ['hips'],
    goalIds: ['lower_body', 'strength'],
  }),
  exercise({
    id: id(21),
    slug: 'supine-heel-slide', // floor block starts here. transfer is the hard requirement.
    familyKey: 'supine-knee-flexion',
    name: 'Supine heel slide',
    category: 'mobility',
    position: 'floor',
    bodyDemands: [body('knees', 'primary', 'moderate'), body('hips', 'secondary', 'moderate')],
    capabilityDemands: [
      capability('supine', 'moderate', true),
      capability('floor_transfer', 'high', true), // getting down is the hard part, not the slide itself
    ],
    equipmentOptions: [optional('exercise-mat')],
    primaryRegionIds: ['knees'],
    goalIds: ['lower_body', 'mobility'],
  }),
  exercise({
    id: id(22),
    slug: 'supine-bridge',
    familyKey: 'hip-extension-floor',
    name: 'Supine bridge',
    category: 'strength',
    position: 'floor',
    difficulty: 3, // floor + high hip demand. low intensity (max 2) will exclude these.
    bodyDemands: [body('hips', 'primary', 'high'), body('lower_back', 'stabilizing', 'moderate')],
    capabilityDemands: [
      capability('supine', 'moderate', true),
      capability('floor_transfer', 'high', true),
    ],
    equipmentOptions: [optional('exercise-mat')],
    primaryRegionIds: ['hips'],
    goalIds: ['lower_body', 'core', 'strength'],
  }),
  exercise({
    id: id(23),
    slug: 'side-lying-clamshell',
    familyKey: 'hip-external-rotation',
    name: 'Side-lying clamshell',
    category: 'strength',
    position: 'floor',
    difficulty: 2,
    bodyDemands: [
      body('hips', 'primary', 'moderate'),
      body('lower_back', 'stabilizing', 'minimal'),
    ],
    capabilityDemands: [
      capability('floor_transfer', 'high', true),
      capability('left_lower_body_weight_bearing', 'minimal', false), // on their side, not standing on it.
      capability('right_lower_body_weight_bearing', 'minimal', false),
    ],
    equipmentOptions: [optional('resistance_band'), optional('exercise-mat')],
    primaryRegionIds: ['hips'],
    goalIds: ['lower_body', 'strength'],
  }),
  exercise({
    id: id(24),
    slug: 'prone-hip-extension',
    familyKey: 'hip-extension-prone',
    name: 'Prone hip extension',
    category: 'strength',
    position: 'floor',
    difficulty: 3, // same intensity gate as the bridge. low preference will drop this too.
    bodyDemands: [body('hips', 'primary', 'high'), body('lower_back', 'stabilizing', 'moderate')],
    capabilityDemands: [
      capability('prone', 'high', true),
      capability('floor_transfer', 'high', true),
    ],
    equipmentOptions: [optional('exercise-mat')],
    primaryRegionIds: ['hips'],
    goalIds: ['lower_body', 'strength'],
  }),
];
