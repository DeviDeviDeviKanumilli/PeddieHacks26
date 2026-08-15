"""Bitmask-based exercise selection for the local model prototype.

Each body region owns one bit. Exercise target and requirement masks are composed
with bitwise OR, target overlap is checked with bitwise AND, and an exercise is
eligible only when every bit in its requirement mask is still available.
"""

from collections.abc import Iterable, Mapping
from typing import TypedDict


# Keep these keys aligned with the body-region IDs in the domain exercise catalog.
BODY_PART_BITS: dict[str, int] = {
    "upper_arms": 1 << 0,
    "elbows": 1 << 1,
    "upper_back": 1 << 2,
    "shoulders": 1 << 3,
    "hips": 1 << 4,
    "thighs": 1 << 5,
    "knees": 1 << 6,
    "torso": 1 << 7,
    "lower_back": 1 << 8,
    "lower_legs": 1 << 9,
    "ankles_feet": 1 << 10,
}

ALL_BODY_PARTS_MASK = (1 << len(BODY_PART_BITS)) - 1


class ExerciseMask(TypedDict):
    target: int
    required: int


def body_part_mask(body_parts: Iterable[str]) -> int:
    """Combine named body-part bits into one mask using bitwise OR."""
    if isinstance(body_parts, str):
        raise TypeError("body_parts must be an iterable of body-part names")

    mask = 0
    for body_part in body_parts:
        try:
            mask |= BODY_PART_BITS[body_part]
        except KeyError as error:
            raise ValueError(f"unknown body part: {body_part}") from error
    return mask


def _exercise_mask(
    targets: tuple[str, ...],
    required: tuple[str, ...],
) -> ExerciseMask:
    return {
        "target": body_part_mask(targets),
        "required": body_part_mask(required),
    }


# The insertion order follows the deterministic 24-exercise domain catalog. A target
# mask describes the exercise's primary purpose. A required mask contains every body
# region the exercise uses, including secondary and stabilizing regions.
EXERCISE_MASKS: dict[str, ExerciseMask] = {
    "seated-biceps-curl": _exercise_mask(
        ("upper_arms",),
        ("upper_arms", "elbows"),
    ),
    "seated-resistance-band-row": _exercise_mask(
        ("upper_back",),
        ("upper_back", "shoulders"),
    ),
    "seated-march": _exercise_mask(("hips",), ("hips", "thighs")),
    "seated-knee-extension": _exercise_mask(
        ("knees",),
        ("knees", "thighs"),
    ),
    "sit-to-stand": _exercise_mask(
        ("hips", "knees"),
        ("hips", "knees"),
    ),
    "wall-push-up": _exercise_mask(
        ("shoulders",),
        ("shoulders", "upper_arms"),
    ),
    "seated-shoulder-press": _exercise_mask(
        ("shoulders",),
        ("shoulders", "upper_arms"),
    ),
    "seated-front-raise": _exercise_mask(
        ("shoulders",),
        ("shoulders", "upper_arms"),
    ),
    "seated-side-reach": _exercise_mask(
        ("torso",),
        ("torso", "shoulders"),
    ),
    "seated-torso-rotation": _exercise_mask(
        ("torso",),
        ("torso", "lower_back"),
    ),
    "seated-heel-raise": _exercise_mask(
        ("lower_legs",),
        ("lower_legs", "ankles_feet"),
    ),
    "seated-toe-tap": _exercise_mask(
        ("ankles_feet",),
        ("ankles_feet", "hips"),
    ),
    "standing-supported-hip-abduction": _exercise_mask(
        ("hips",),
        ("hips", "thighs"),
    ),
    "standing-supported-hip-extension": _exercise_mask(
        ("hips",),
        ("hips", "lower_back"),
    ),
    "supported-calf-raise": _exercise_mask(
        ("lower_legs",),
        ("lower_legs", "ankles_feet"),
    ),
    "chair-supported-mini-squat": _exercise_mask(
        ("hips", "knees"),
        ("hips", "knees"),
    ),
    "wall-shoulder-slide": _exercise_mask(
        ("shoulders", "upper_back"),
        ("shoulders", "upper_back"),
    ),
    "seated-band-chest-press": _exercise_mask(
        ("shoulders",),
        ("shoulders", "upper_arms"),
    ),
    "seated-ankle-pump": _exercise_mask(
        ("ankles_feet",),
        ("ankles_feet", "lower_legs"),
    ),
    "seated-glute-squeeze": _exercise_mask(
        ("hips",),
        ("hips", "thighs"),
    ),
    "supine-heel-slide": _exercise_mask(
        ("knees",),
        ("knees", "hips"),
    ),
    "supine-bridge": _exercise_mask(
        ("hips",),
        ("hips", "lower_back"),
    ),
    "side-lying-clamshell": _exercise_mask(
        ("hips",),
        ("hips", "lower_back"),
    ),
    "prone-hip-extension": _exercise_mask(
        ("hips",),
        ("hips", "lower_back"),
    ),
}


def available_body_parts_mask(unavailable_body_parts: Iterable[str]) -> int:
    """Return the all-ones body mask with unavailable body-part bits cleared."""
    unavailable_mask = body_part_mask(unavailable_body_parts)
    return ALL_BODY_PARTS_MASK & ~unavailable_mask


def masks_overlap(left_mask: int, right_mask: int) -> bool:
    """Return True when two masks share at least one enabled bit."""
    return (left_mask & right_mask) != 0


def select_exercises(
    target_body_parts: Iterable[str],
    unavailable_body_parts: Iterable[str] = (),
    exercise_masks: Mapping[str, ExerciseMask] = EXERCISE_MASKS,
) -> list[str]:
    """Return exercises that match a target and use only available body parts.

    An empty target selection returns an empty list. Results retain the stable order
    of ``exercise_masks``.
    """
    target_mask = body_part_mask(target_body_parts)
    if target_mask == 0:
        return []

    available_mask = available_body_parts_mask(unavailable_body_parts)
    selected: list[str] = []

    for exercise_name, masks in exercise_masks.items():
        matches_target = masks_overlap(masks["target"], target_mask)
        meets_constraints = (
            masks["required"] & available_mask
        ) == masks["required"]
        if matches_target and meets_constraints:
            selected.append(exercise_name)

    return selected
