import unittest

from exercise_selector import (
    all_bits_mask,
    available_mask,
    build_mask,
    masks_are_disjoint,
    masks_overlap,
    select_exercises,
)


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


if __name__ == "__main__":
    unittest.main()
