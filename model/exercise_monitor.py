from dataclasses import dataclass
from math import isfinite

from exercise_analyzer import (
    ExercisePhase,
    ExerciseSetTracker,
    RangeOfMotionTracker,
    RepCounter,
)
from exercise_catalog import EXERCISE_CATALOG
from vision_model import (
    BodyCoordinate,
    body_part_indices,
    build_body_coordinate_map,
    get_angles_from_coordinates,
)


@dataclass(frozen=True)
class AngleRule:
    """Three body parts and the two thresholds defining one rep cycle."""

    body_parts: tuple[str, str, str]
    target_angle_degrees: float
    return_angle_degrees: float

    def __post_init__(self):
        # Resolve once during module loading so bad body-part names fail early.
        body_part_indices(self.body_parts)
        target = float(self.target_angle_degrees)
        return_angle = float(self.return_angle_degrees)
        if (
            not isfinite(target)
            or not isfinite(return_angle)
            or not 0.0 <= target <= 180.0
            or not 0.0 <= return_angle <= 180.0
            or target == return_angle
        ):
            raise ValueError(
                "target and return angles must be different values between 0 and 180"
            )

    @property
    def landmark_indices(self) -> tuple[int, int, int]:
        return body_part_indices(self.body_parts)


def _rule(point_1, vertex, point_2, target, return_angle):
    return AngleRule(
        (point_1, vertex, point_2),
        target_angle_degrees=target,
        return_angle_degrees=return_angle,
    )


# Each entry is a map of angle channel -> point/vertex/point vector definition.
# Every configured channel must finish its target-to-return cycle before the
# overall rep advances. Thresholds are practical starting points and should be
# calibrated for camera placement and the intended exercise variation.
EXERCISE_ANGLE_MAP: dict[str, dict[str, AngleRule]] = {
    "squat": {
        "left_knee": _rule(
            "left_hip", "left_knee", "left_ankle", 90.0, 160.0
        ),
        "right_knee": _rule(
            "right_hip", "right_knee", "right_ankle", 90.0, 160.0
        ),
        "left_hip": _rule(
            "left_shoulder", "left_hip", "left_knee", 75.0, 150.0
        ),
        "right_hip": _rule(
            "right_shoulder", "right_hip", "right_knee", 75.0, 150.0
        ),
    },
    "sit-to-stand": {
        "left_knee": _rule(
            "left_hip", "left_knee", "left_ankle", 100.0, 155.0
        ),
        "right_knee": _rule(
            "right_hip", "right_knee", "right_ankle", 100.0, 155.0
        ),
        "left_hip": _rule(
            "left_shoulder", "left_hip", "left_knee", 95.0, 150.0
        ),
        "right_hip": _rule(
            "right_shoulder", "right_hip", "right_knee", 95.0, 150.0
        ),
    },
    "lunges": {
        "left_knee": _rule(
            "left_hip", "left_knee", "left_ankle", 90.0, 155.0
        ),
        "right_knee": _rule(
            "right_hip", "right_knee", "right_ankle", 90.0, 155.0
        ),
        "left_hip": _rule(
            "left_shoulder", "left_hip", "left_knee", 95.0, 150.0
        ),
        "right_hip": _rule(
            "right_shoulder", "right_hip", "right_knee", 95.0, 150.0
        ),
    },
    "calf-raises": {
        "left_ankle": _rule(
            "left_knee", "left_ankle", "left_foot_index", 120.0, 100.0
        ),
        "right_ankle": _rule(
            "right_knee", "right_ankle", "right_foot_index", 120.0, 100.0
        ),
    },
    "push-up": {
        "left_elbow": _rule(
            "left_shoulder", "left_elbow", "left_wrist", 90.0, 155.0
        ),
        "right_elbow": _rule(
            "right_shoulder", "right_elbow", "right_wrist", 90.0, 155.0
        ),
    },
    "resistance-band-row": {
        "left_elbow": _rule(
            "left_shoulder", "left_elbow", "left_wrist", 60.0, 150.0
        ),
        "right_elbow": _rule(
            "right_shoulder", "right_elbow", "right_wrist", 60.0, 150.0
        ),
    },
    "shoulder-press": {
        "left_elbow": _rule(
            "left_shoulder", "left_elbow", "left_wrist", 160.0, 90.0
        ),
        "right_elbow": _rule(
            "right_shoulder", "right_elbow", "right_wrist", 160.0, 90.0
        ),
        "left_shoulder": _rule(
            "left_hip", "left_shoulder", "left_elbow", 155.0, 75.0
        ),
        "right_shoulder": _rule(
            "right_hip", "right_shoulder", "right_elbow", 155.0, 75.0
        ),
    },
    "biceps-curl": {
        "left_elbow": _rule(
            "left_shoulder", "left_elbow", "left_wrist", 60.0, 90.0
        ),
        "right_elbow": _rule(
            "right_shoulder", "right_elbow", "right_wrist", 60.0, 90.0
        ),
    },
    "seated-trunk-rotation": {
        "left_trunk_rotation": _rule(
            "left_shoulder", "left_hip", "right_hip", 65.0, 85.0
        ),
        "right_trunk_rotation": _rule(
            "right_shoulder", "right_hip", "left_hip", 65.0, 85.0
        ),
    },
    "leg-raise-knee-raise": {
        "left_hip": _rule(
            "left_shoulder", "left_hip", "left_knee", 80.0, 150.0
        ),
        "right_hip": _rule(
            "right_shoulder", "right_hip", "right_knee", 80.0, 150.0
        ),
    },
}


EXERCISE_ALIASES = {
    "squats": "squat",
    "sit-to-stands": "sit-to-stand",
    "lunge": "lunges",
    "calf-raise": "calf-raises",
    "push-ups": "push-up",
    "pushup": "push-up",
    "pushups": "push-up",
    "band-row": "resistance-band-row",
    "shoulder-presses": "shoulder-press",
    "bicep-curl": "biceps-curl",
    "bicep-curls": "biceps-curl",
    "biceps-curls": "biceps-curl",
    "trunk-rotation": "seated-trunk-rotation",
    "leg-raise": "leg-raise-knee-raise",
    "knee-raise": "leg-raise-knee-raise",
}


def _normalize_exercise_name(exercise_name: str) -> str:
    if not isinstance(exercise_name, str) or not exercise_name.strip():
        raise ValueError("exercise_name must be a non-empty string")
    return "-".join(exercise_name.strip().lower().replace("_", "-").split())


def resolve_exercise_id(exercise_name: str) -> str:
    """Resolve a catalog id, display name, or common alias."""
    normalized = _normalize_exercise_name(exercise_name)
    exercise_id = EXERCISE_ALIASES.get(normalized, normalized)
    if exercise_id in EXERCISE_ANGLE_MAP:
        return exercise_id

    for catalog_id, entry in EXERCISE_CATALOG.items():
        if _normalize_exercise_name(str(entry["name"])) == normalized:
            return catalog_id

    choices = ", ".join(EXERCISE_ANGLE_MAP)
    raise ValueError(f"unsupported exercise: {exercise_name}. Choose from: {choices}")


def available_exercises() -> tuple[str, ...]:
    return tuple(EXERCISE_ANGLE_MAP)


def _rules_for_side(exercise_id: str, side: str) -> dict[str, AngleRule]:
    normalized_side = side.strip().lower() if isinstance(side, str) else ""
    if normalized_side not in {"both", "left", "right"}:
        raise ValueError("side must be 'both', 'left', or 'right'")

    rules = EXERCISE_ANGLE_MAP[exercise_id]
    if normalized_side == "both":
        return dict(rules)

    selected = {
        name: rule
        for name, rule in rules.items()
        if name.startswith(f"{normalized_side}_")
    }
    if not selected:
        raise ValueError(f"{exercise_id} has no {normalized_side}-side angle rules")
    return selected


class ExerciseMonitor:
    """Measure and synchronize all configured body-part angles for an exercise."""

    def __init__(
        self,
        exercise_name: str,
        total_sets: int,
        reps_per_set: int,
        rest_seconds: float = 5.0,
        side: str = "both",
        target_angle_degrees: float | None = None,
        return_angle_degrees: float | None = None,
    ) -> None:
        self.exercise_id = resolve_exercise_id(exercise_name)
        self.exercise_name = str(EXERCISE_CATALOG[self.exercise_id]["name"])
        self.angle_rules = _rules_for_side(self.exercise_id, side)

        counters = {}
        for angle_name, rule in self.angle_rules.items():
            target = (
                rule.target_angle_degrees
                if target_angle_degrees is None
                else target_angle_degrees
            )
            return_angle = (
                rule.return_angle_degrees
                if return_angle_degrees is None
                else return_angle_degrees
            )
            counters[angle_name] = RepCounter(
                rule.landmark_indices,
                target,
                return_angle,
            )

        self.tracker = ExerciseSetTracker(
            limb_counters=counters,
            total_sets=total_sets,
            reps_per_set=reps_per_set,
            rest_seconds=rest_seconds,
        )
        self.motion_trackers = {
            angle_name: RangeOfMotionTracker() for angle_name in self.angle_rules
        }
        self.body_coordinates: dict[str, BodyCoordinate] = {}
        self.joint_angles: dict[str, float | None] = {
            angle_name: None for angle_name in self.angle_rules
        }

    def process_landmarks(
        self,
        image_landmarks,
        now_seconds: float,
        frame_size=None,
    ) -> bool:
        """Map one image-space pose to 2D angles and update every channel."""
        self.body_coordinates = build_body_coordinate_map(
            image_landmarks,
            include_depth=False,
            image_size=frame_size,
        )
        self.joint_angles = get_angles_from_coordinates(
            self.body_coordinates,
            {
                angle_name: rule.body_parts
                for angle_name, rule in self.angle_rules.items()
            },
        )
        return self.update_angles(self.joint_angles, now_seconds)

    def process_missing_pose(self, now_seconds: float) -> bool:
        """Advance timers without changing motion state when no pose is visible."""
        self.body_coordinates = {}
        self.joint_angles = {
            angle_name: None for angle_name in self.angle_rules
        }
        return self.update_angles(self.joint_angles, now_seconds)

    def update_angles(
        self,
        joint_angles: dict[str, float | None],
        now_seconds: float,
    ) -> bool:
        """Update synchronized counters; exposed for non-camera integrations/tests."""
        was_active = self.tracker.phase is ExercisePhase.ACTIVE
        rep_completed = self.tracker.update(joint_angles, now_seconds)
        if was_active:
            for angle_name, angle in joint_angles.items():
                self.motion_trackers[angle_name].add_angle(angle)
        return rep_completed
