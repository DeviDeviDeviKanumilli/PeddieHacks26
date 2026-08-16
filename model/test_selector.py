import unittest

from exercise_catalog import EXERCISE_CATALOG, JOINT_BITS, MUSCLE_BITS
from exercise_selector import (
    all_bits_mask,
    available_mask,
    build_mask,
    masks_are_disjoint,
    masks_overlap,
    select_exercises,
)


ARM_MUSCLE_SUFFIXES = {
    "shoulder",
    "biceps",
    "triceps",
    "forearm",
    "hand_grip",
}
ARM_JOINT_SUFFIXES = {"shoulder", "elbow", "wrist"}


def names_in_mask(mask, bit_map):
    """Decode a catalog bitmask using body-part data from exercise_catalog."""
    return tuple(name for name, bit in bit_map.items() if mask & bit)


def arm_restrictions(side):
    """Derive all unavailable muscles and joints for a missing arm."""
    if side not in {"left", "right"}:
        raise ValueError("side must be left or right")
    prefix = f"{side}_"
    muscles = tuple(
        name
        for name in MUSCLE_BITS
        if name.startswith(prefix)
        and name.removeprefix(prefix) in ARM_MUSCLE_SUFFIXES
    )
    joints = tuple(
        name
        for name in JOINT_BITS
        if name.startswith(prefix)
        and name.removeprefix(prefix) in ARM_JOINT_SUFFIXES
    )
    return muscles, joints


class MaskFunctionsTest(unittest.TestCase):
    def setUp(self):
        self.muscle_bits = {
            "left_arm": 1 << 0,
            "right_arm": 1 << 1,
            "core": 1 << 2,
        }
        self.joint_bits = {
            "left_elbow": 1 << 0,
            "right_elbow": 1 << 1,
        }

    def test_builds_mask_with_bitwise_or(self):
        mask = build_mask(("left_arm", "core"), self.muscle_bits)

        self.assertEqual(
            mask,
            self.muscle_bits["left_arm"] | self.muscle_bits["core"],
        )

    def test_builds_all_and_available_masks(self):
        complete = all_bits_mask(self.muscle_bits)
        available = available_mask(("right_arm", "right_arm"), self.muscle_bits)

        self.assertEqual(complete, (1 << len(self.muscle_bits)) - 1)
        self.assertEqual(available & self.muscle_bits["right_arm"], 0)
        self.assertEqual(
            available & self.muscle_bits["left_arm"],
            self.muscle_bits["left_arm"],
        )

    def test_detects_overlap_and_disjoint_masks_with_bitwise_and(self):
        left = self.muscle_bits["left_arm"]
        right = self.muscle_bits["right_arm"]
        both = left | right

        self.assertTrue(masks_overlap(both, right))
        self.assertFalse(masks_overlap(left, right))
        self.assertTrue(masks_are_disjoint(left, right))
        self.assertFalse(masks_are_disjoint(both, right))

    def test_rejects_unknown_names_and_string_iterables(self):
        with self.assertRaisesRegex(ValueError, "unknown mask name: wings"):
            build_mask(("wings",), self.muscle_bits)
        with self.assertRaisesRegex(TypeError, "iterable of names"):
            build_mask("left_arm", self.muscle_bits)


class GenericExerciseSelectionTest(unittest.TestCase):
    def setUp(self):
        self.muscle_bits = {
            "left_arm": 1 << 0,
            "right_arm": 1 << 1,
            "core": 1 << 2,
        }
        self.joint_bits = {
            "left_elbow": 1 << 0,
            "right_elbow": 1 << 1,
        }
        self.catalog = {
            "bilateral-curl": {
                "name": "Bilateral curl",
                "muscle_mask": build_mask(
                    ("left_arm", "right_arm"), self.muscle_bits
                ),
                "joint_mask": build_mask(
                    ("left_elbow", "right_elbow"), self.joint_bits
                ),
            },
            "core-hold": {
                "name": "Core hold",
                "muscle_mask": build_mask(("core",), self.muscle_bits),
                "joint_mask": 0,
            },
        }

    def select(self, targets, unavailable_muscles=(), unavailable_joints=()):
        return select_exercises(
            targets,
            unavailable_muscles,
            unavailable_joints,
            muscle_bits=self.muscle_bits,
            joint_bits=self.joint_bits,
            exercise_catalog=self.catalog,
        )

    def test_selects_any_matching_target(self):
        self.assertEqual(self.select(("left_arm",)), ["bilateral-curl"])

    def test_excludes_unavailable_muscles_and_joints(self):
        self.assertEqual(
            self.select(("left_arm",), unavailable_muscles=("right_arm",)),
            [],
        )
        self.assertEqual(
            self.select(("left_arm",), unavailable_joints=("left_elbow",)),
            [],
        )

    def test_returns_empty_without_a_target(self):
        self.assertEqual(self.select(()), [])

    def test_rejects_invalid_catalog_masks(self):
        invalid_catalog = {
            "broken": {
                "name": "Broken",
                "muscle_mask": "left_arm",
                "joint_mask": 0,
            }
        }

        with self.assertRaisesRegex(ValueError, "must define non-negative"):
            select_exercises(
                ("left_arm",),
                muscle_bits=self.muscle_bits,
                joint_bits=self.joint_bits,
                exercise_catalog=invalid_catalog,
            )


class RealCatalogUserNeedsTest(unittest.TestCase):
    def select_for_user(
        self,
        target_muscles,
        unavailable_muscles=(),
        unavailable_joints=(),
    ):
        return select_exercises(
            target_muscles,
            unavailable_muscles,
            unavailable_joints,
            muscle_bits=MUSCLE_BITS,
            joint_bits=JOINT_BITS,
            exercise_catalog=EXERCISE_CATALOG,
        )

    def print_scenario(
        self,
        title,
        target_muscles,
        unavailable_muscles=(),
        unavailable_joints=(),
    ):
        selected = self.select_for_user(
            target_muscles,
            unavailable_muscles,
            unavailable_joints,
        )
        target_mask = build_mask(target_muscles, MUSCLE_BITS)
        unavailable_muscle_mask = build_mask(
            unavailable_muscles,
            MUSCLE_BITS,
        )
        unavailable_joint_mask = build_mask(
            unavailable_joints,
            JOINT_BITS,
        )

        print(f"\n=== Selector scenario: {title} ===")
        print("Targets:", ", ".join(target_muscles) or "none")
        print(
            "Unavailable muscles:",
            ", ".join(unavailable_muscles) or "none",
        )
        print(
            "Unavailable joints:",
            ", ".join(unavailable_joints) or "none",
        )

        for exercise_id, exercise in EXERCISE_CATALOG.items():
            muscle_mask = exercise["muscle_mask"]
            joint_mask = exercise["joint_mask"]
            if not masks_overlap(muscle_mask, target_mask):
                continue

            muscle_conflicts = names_in_mask(
                muscle_mask & unavailable_muscle_mask,
                MUSCLE_BITS,
            )
            joint_conflicts = names_in_mask(
                joint_mask & unavailable_joint_mask,
                JOINT_BITS,
            )
            if exercise_id in selected:
                print(f"SELECT {exercise_id}: compatible")
                continue

            reasons = []
            if muscle_conflicts:
                reasons.append(f"muscles={','.join(muscle_conflicts)}")
            if joint_conflicts:
                reasons.append(f"joints={','.join(joint_conflicts)}")
            print(f"REJECT {exercise_id}: {'; '.join(reasons)}")

        print("Final selection:", ", ".join(selected) or "none")
        return selected

    def test_retrieves_real_body_parts_from_catalog_masks(self):
        right_arm_muscles, right_arm_joints = arm_restrictions("right")
        curl = EXERCISE_CATALOG["biceps-curl"]
        curl_muscles = names_in_mask(curl["muscle_mask"], MUSCLE_BITS)
        curl_joints = names_in_mask(curl["joint_mask"], JOINT_BITS)

        print("\n=== Body-part data retrieved from exercise_catalog ===")
        print("Missing right-arm muscles:", ", ".join(right_arm_muscles))
        print("Missing right-arm joints:", ", ".join(right_arm_joints))
        print("Biceps-curl muscles:", ", ".join(curl_muscles))
        print("Biceps-curl joints:", ", ".join(curl_joints))

        self.assertIn("right_biceps", right_arm_muscles)
        self.assertIn("right_elbow", right_arm_joints)
        self.assertIn("left_biceps", curl_muscles)
        self.assertIn("right_wrist", curl_joints)

    def test_rejects_bilateral_arm_exercises_for_a_missing_right_arm(self):
        unavailable_muscles, unavailable_joints = arm_restrictions("right")

        selected = self.print_scenario(
            "left-biceps target with missing right arm",
            target_muscles=("left_biceps",),
            unavailable_muscles=unavailable_muscles,
            unavailable_joints=unavailable_joints,
        )

        self.assertEqual(selected, [])

    def test_keeps_safe_core_options_for_a_missing_right_arm(self):
        unavailable_muscles, unavailable_joints = arm_restrictions("right")

        selected = self.print_scenario(
            "core target with missing right arm",
            target_muscles=("left_abdomen_core",),
            unavailable_muscles=unavailable_muscles,
            unavailable_joints=unavailable_joints,
        )

        self.assertEqual(
            selected,
            ["squat", "seated-trunk-rotation", "leg-raise-knee-raise"],
        )

    def test_rejects_only_exercises_using_a_restricted_shoulder(self):
        selected = self.print_scenario(
            "left-biceps target with restricted left shoulder",
            target_muscles=("left_biceps",),
            unavailable_muscles=("left_shoulder",),
        )

        self.assertEqual(selected, ["biceps-curl"])


if __name__ == "__main__":
    unittest.main()
