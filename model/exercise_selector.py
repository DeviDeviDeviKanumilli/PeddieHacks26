"""Generic bitmask functions for selecting exercises.

This module intentionally contains no body-part, joint, or exercise catalog data.
Callers provide those mappings so the selection logic can be reused with any catalog.
"""

from collections.abc import Iterable, Mapping


def build_mask(names: Iterable[str], bit_map: Mapping[str, int]) -> int:
    """Combine named values into one mask using bitwise OR."""
    if isinstance(names, str):
        raise TypeError("names must be an iterable of names, not a string")

    mask = 0
    for name in names:
        try:
            mask |= bit_map[name]
        except KeyError as error:
            raise ValueError(f"unknown mask name: {name}") from error
    return mask


def all_bits_mask(bit_map: Mapping[str, int]) -> int:
    """Return a mask containing every bit defined in a mapping."""
    return build_mask(bit_map, bit_map)


def available_mask(
    unavailable_names: Iterable[str],
    bit_map: Mapping[str, int],
) -> int:
    """Return the complete mask with unavailable named bits cleared."""
    unavailable = build_mask(unavailable_names, bit_map)
    return all_bits_mask(bit_map) & ~unavailable


def masks_overlap(left_mask: int, right_mask: int) -> bool:
    """Return True when two masks share at least one enabled bit."""
    return (left_mask & right_mask) != 0


def masks_are_disjoint(left_mask: int, right_mask: int) -> bool:
    """Return True when two masks have no enabled bits in common."""
    return (left_mask & right_mask) == 0


def select_exercises(
    target_muscles: Iterable[str],
    unavailable_muscles: Iterable[str] = (),
    unavailable_joints: Iterable[str] = (),
    *,
    muscle_bits: Mapping[str, int],
    joint_bits: Mapping[str, int],
    exercise_catalog: Mapping[str, Mapping[str, int | str]],
) -> list[str]:
    """Select exercises matching a target without unavailable muscles or joints.

    Each exercise entry must contain integer ``muscle_mask`` and ``joint_mask``
    fields. An exercise matches when it trains at least one requested muscle and
    shares no bits with either unavailable mask.
    """
    target_mask = build_mask(target_muscles, muscle_bits)
    if target_mask == 0:
        return []

    unavailable_muscle_mask = build_mask(unavailable_muscles, muscle_bits)
    unavailable_joint_mask = build_mask(unavailable_joints, joint_bits)
    selected: list[str] = []

    for exercise_id, entry in exercise_catalog.items():
        muscle_mask = entry.get("muscle_mask")
        joint_mask = entry.get("joint_mask")
        if (
            isinstance(muscle_mask, bool)
            or not isinstance(muscle_mask, int)
            or muscle_mask < 0
            or isinstance(joint_mask, bool)
            or not isinstance(joint_mask, int)
            or joint_mask < 0
        ):
            raise ValueError(
                f"exercise {exercise_id} must define non-negative integer masks"
            )

        if (
            masks_overlap(muscle_mask, target_mask)
            and masks_are_disjoint(muscle_mask, unavailable_muscle_mask)
            and masks_are_disjoint(joint_mask, unavailable_joint_mask)
        ):
            selected.append(exercise_id)

    return selected
