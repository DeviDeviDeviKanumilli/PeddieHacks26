"""Muscle, joint, and exercise mask data for the local model prototype."""

from exercise_selector import build_mask


MUSCLE_BITS: dict[str, int] = {
    "left_neck": 1 << 0,
    "right_neck": 1 << 1,
    "left_shoulder": 1 << 2,
    "right_shoulder": 1 << 3,
    "left_chest": 1 << 4,
    "right_chest": 1 << 5,
    "left_upper_back": 1 << 6,
    "right_upper_back": 1 << 7,
    "left_lower_back": 1 << 8,
    "right_lower_back": 1 << 9,
    "left_biceps": 1 << 10,
    "right_biceps": 1 << 11,
    "left_triceps": 1 << 12,
    "right_triceps": 1 << 13,
    "left_forearm": 1 << 14,
    "right_forearm": 1 << 15,
    "left_hand_grip": 1 << 16,
    "right_hand_grip": 1 << 17,
    "left_abdomen_core": 1 << 18,
    "right_abdomen_core": 1 << 19,
    "left_oblique": 1 << 20,
    "right_oblique": 1 << 21,
    "left_hip_flexors": 1 << 22,
    "right_hip_flexors": 1 << 23,
    "left_glute": 1 << 24,
    "right_glute": 1 << 25,
    "left_quadriceps": 1 << 26,
    "right_quadriceps": 1 << 27,
    "left_hamstrings": 1 << 28,
    "right_hamstrings": 1 << 29,
    "left_inner_thigh_adductors": 1 << 30,
    "right_inner_thigh_adductors": 1 << 31,
    "left_outer_thigh_abductors": 1 << 32,
    "right_outer_thigh_abductors": 1 << 33,
    "left_calf": 1 << 34,
    "right_calf": 1 << 35,
    "left_foot": 1 << 36,
    "right_foot": 1 << 37,
}


JOINT_BITS: dict[str, int] = {
    "neck": 1 << 0,
    "left_shoulder": 1 << 1,
    "right_shoulder": 1 << 2,
    "left_elbow": 1 << 3,
    "right_elbow": 1 << 4,
    "left_wrist": 1 << 5,
    "right_wrist": 1 << 6,
    "spine_trunk": 1 << 7,
    "left_hip": 1 << 8,
    "right_hip": 1 << 9,
    "left_knee": 1 << 10,
    "right_knee": 1 << 11,
    "left_ankle": 1 << 12,
    "right_ankle": 1 << 13,
}


def _muscles(*names: str) -> int:
    return build_mask(names, MUSCLE_BITS)


def _joints(*names: str) -> int:
    return build_mask(names, JOINT_BITS)


EXERCISE_CATALOG: dict[str, dict[str, int | str]] = {
    "squat": {
        "name": "Squat",
        "muscle_mask": _muscles(
            "left_glute",
            "right_glute",
            "left_quadriceps",
            "right_quadriceps",
            "left_hamstrings",
            "right_hamstrings",
            "left_abdomen_core",
            "right_abdomen_core",
        ),
        "joint_mask": _joints(
            "left_hip",
            "right_hip",
            "left_knee",
            "right_knee",
            "left_ankle",
            "right_ankle",
        ),
    },
    "sit-to-stand": {
        "name": "Sit-to-stand",
        "muscle_mask": _muscles(
            "left_glute",
            "right_glute",
            "left_quadriceps",
            "right_quadriceps",
            "left_hamstrings",
            "right_hamstrings",
        ),
        "joint_mask": _joints(
            "left_hip",
            "right_hip",
            "left_knee",
            "right_knee",
            "left_ankle",
            "right_ankle",
        ),
    },
    "lunges": {
        "name": "Lunges",
        "muscle_mask": _muscles(
            "left_glute",
            "right_glute",
            "left_quadriceps",
            "right_quadriceps",
            "left_hamstrings",
            "right_hamstrings",
            "left_calf",
            "right_calf",
        ),
        "joint_mask": _joints(
            "left_hip",
            "right_hip",
            "left_knee",
            "right_knee",
            "left_ankle",
            "right_ankle",
        ),
    },
    "calf-raises": {
        "name": "Calf raises",
        "muscle_mask": _muscles(
            "left_calf",
            "right_calf",
            "left_foot",
            "right_foot",
        ),
        "joint_mask": _joints("left_ankle", "right_ankle"),
    },
    "push-up": {
        "name": "Push-up",
        "muscle_mask": _muscles(
            "left_chest",
            "right_chest",
            "left_triceps",
            "right_triceps",
            "left_shoulder",
            "right_shoulder",
            "left_abdomen_core",
            "right_abdomen_core",
        ),
        "joint_mask": _joints(
            "left_shoulder",
            "right_shoulder",
            "left_elbow",
            "right_elbow",
            "left_wrist",
            "right_wrist",
        ),
    },
    "resistance-band-row": {
        "name": "Resistance-band row",
        # Rear shoulders use the requested general left/right shoulder bits.
        "muscle_mask": _muscles(
            "left_upper_back",
            "right_upper_back",
            "left_biceps",
            "right_biceps",
            "left_shoulder",
            "right_shoulder",
        ),
        "joint_mask": _joints(
            "left_shoulder",
            "right_shoulder",
            "left_elbow",
            "right_elbow",
        ),
    },
    "shoulder-press": {
        "name": "Shoulder press",
        "muscle_mask": _muscles(
            "left_shoulder",
            "right_shoulder",
            "left_triceps",
            "right_triceps",
            "left_upper_back",
            "right_upper_back",
        ),
        "joint_mask": _joints(
            "left_shoulder",
            "right_shoulder",
            "left_elbow",
            "right_elbow",
        ),
    },
    "biceps-curl": {
        "name": "Biceps curl",
        "muscle_mask": _muscles(
            "left_biceps",
            "right_biceps",
            "left_forearm",
            "right_forearm",
        ),
        "joint_mask": _joints(
            "left_elbow",
            "right_elbow",
            "left_wrist",
            "right_wrist",
        ),
    },
    "seated-trunk-rotation": {
        "name": "Seated trunk rotation",
        "muscle_mask": _muscles(
            "left_abdomen_core",
            "right_abdomen_core",
            "left_oblique",
            "right_oblique",
            "left_lower_back",
            "right_lower_back",
        ),
        "joint_mask": _joints("spine_trunk", "left_hip", "right_hip"),
    },
    "leg-raise-knee-raise": {
        "name": "Leg raise / knee raise",
        "muscle_mask": _muscles(
            "left_hip_flexors",
            "right_hip_flexors",
            "left_quadriceps",
            "right_quadriceps",
            "left_abdomen_core",
            "right_abdomen_core",
        ),
        "joint_mask": _joints(
            "left_hip",
            "right_hip",
            "left_knee",
            "right_knee",
        ),
    },
}
