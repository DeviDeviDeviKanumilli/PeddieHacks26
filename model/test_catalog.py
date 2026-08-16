import unittest

from exercise_catalog import EXERCISE_CATALOG, JOINT_BITS, MUSCLE_BITS
from exercise_selector import build_mask, select_exercises


class ExerciseCatalogTest(unittest.TestCase):
    def assert_unique_power_of_two_bits(self, bit_map):
        values = list(bit_map.values())
        self.assertEqual(len(values), len(set(values)))
        for value in values:
            with self.subTest(value=value):
                self.assertGreater(value, 0)
                self.assertEqual(value & (value - 1), 0)

    def test_defines_all_requested_muscles_and_joints(self):
        self.assertEqual(len(MUSCLE_BITS), 38)
        self.assertEqual(len(JOINT_BITS), 14)
        self.assert_unique_power_of_two_bits(MUSCLE_BITS)
        self.assert_unique_power_of_two_bits(JOINT_BITS)
        self.assertEqual(MUSCLE_BITS["left_neck"], 1 << 0)
        self.assertEqual(MUSCLE_BITS["right_foot"], 1 << 37)
        self.assertEqual(JOINT_BITS["neck"], 1 << 0)
        self.assertEqual(JOINT_BITS["right_ankle"], 1 << 13)

    def test_defines_the_ten_requested_exercises(self):
        self.assertEqual(
            list(EXERCISE_CATALOG),
            [
                "squat",
                "sit-to-stand",
                "lunges",
                "calf-raises",
                "push-up",
                "resistance-band-row",
                "shoulder-press",
                "biceps-curl",
                "seated-trunk-rotation",
                "leg-raise-knee-raise",
            ],
        )

    def test_squat_contains_requested_muscles_and_joints(self):
        squat = EXERCISE_CATALOG["squat"]
        expected_muscles = build_mask(
            (
                "left_glute",
                "right_glute",
                "left_quadriceps",
                "right_quadriceps",
                "left_hamstrings",
                "right_hamstrings",
                "left_abdomen_core",
                "right_abdomen_core",
            ),
            MUSCLE_BITS,
        )
        expected_joints = build_mask(
            (
                "left_hip",
                "right_hip",
                "left_knee",
                "right_knee",
                "left_ankle",
                "right_ankle",
            ),
            JOINT_BITS,
        )

        self.assertEqual(squat["muscle_mask"], expected_muscles)
        self.assertEqual(squat["joint_mask"], expected_joints)

    def test_selects_catalog_exercises_by_muscle(self):
        selected = select_exercises(
            ("left_biceps",),
            muscle_bits=MUSCLE_BITS,
            joint_bits=JOINT_BITS,
            exercise_catalog=EXERCISE_CATALOG,
        )

        self.assertEqual(selected, ["resistance-band-row", "biceps-curl"])

    def test_filters_catalog_by_unavailable_muscles_and_joints(self):
        without_left_shoulder = select_exercises(
            ("left_biceps",),
            unavailable_muscles=("left_shoulder",),
            muscle_bits=MUSCLE_BITS,
            joint_bits=JOINT_BITS,
            exercise_catalog=EXERCISE_CATALOG,
        )
        without_left_wrist = select_exercises(
            ("left_biceps",),
            unavailable_joints=("left_wrist",),
            muscle_bits=MUSCLE_BITS,
            joint_bits=JOINT_BITS,
            exercise_catalog=EXERCISE_CATALOG,
        )

        self.assertEqual(without_left_shoulder, ["biceps-curl"])
        self.assertEqual(without_left_wrist, ["resistance-band-row"])


if __name__ == "__main__":
    unittest.main()
