import unittest

from exercise_selector import (
    ALL_BODY_PARTS_MASK,
    BODY_PART_BITS,
    EXERCISE_MASKS,
    available_body_parts_mask,
    body_part_mask,
    masks_overlap,
    select_exercises,
)


class BodyPartMaskTest(unittest.TestCase):
    def test_body_parts_have_unique_power_of_two_values(self):
        values = list(BODY_PART_BITS.values())

        self.assertEqual(len(values), len(set(values)))
        for value in values:
            with self.subTest(value=value):
                self.assertGreater(value, 0)
                self.assertEqual(value & (value - 1), 0)

    def test_combines_body_parts_with_bitwise_or(self):
        mask = body_part_mask(("hips", "knees"))

        self.assertEqual(mask, BODY_PART_BITS["hips"] | BODY_PART_BITS["knees"])

    def test_uses_bitwise_and_to_detect_only_shared_bits(self):
        hips = BODY_PART_BITS["hips"]
        knees = BODY_PART_BITS["knees"]
        hips_and_knees = hips | knees

        self.assertTrue(masks_overlap(hips_and_knees, knees))
        self.assertFalse(masks_overlap(hips, knees))

    def test_all_body_parts_mask_has_every_defined_bit(self):
        self.assertEqual(ALL_BODY_PARTS_MASK, (1 << len(BODY_PART_BITS)) - 1)
        for bit in BODY_PART_BITS.values():
            self.assertEqual(ALL_BODY_PARTS_MASK & bit, bit)

    def test_clears_each_unavailable_bit_without_changing_other_bits(self):
        available_mask = available_body_parts_mask(("knees", "knees"))

        self.assertEqual(available_mask & BODY_PART_BITS["knees"], 0)
        self.assertEqual(
            available_mask & BODY_PART_BITS["hips"],
            BODY_PART_BITS["hips"],
        )

    def test_rejects_unknown_body_parts_and_string_iterables(self):
        with self.assertRaisesRegex(ValueError, "unknown body part: wings"):
            body_part_mask(("wings",))
        with self.assertRaisesRegex(TypeError, "must be an iterable"):
            body_part_mask("hips")


class ExerciseSelectionTest(unittest.TestCase):
    def test_exercise_dictionary_contains_the_curated_catalog(self):
        self.assertEqual(len(EXERCISE_MASKS), 24)

    def test_selects_exercises_with_any_requested_target_overlap(self):
        selected = select_exercises(("upper_arms", "knees"))

        self.assertIn("seated-biceps-curl", selected)
        self.assertIn("seated-knee-extension", selected)
        self.assertIn("sit-to-stand", selected)
        self.assertNotIn("seated-march", selected)

    def test_excludes_exercise_when_any_required_part_is_unavailable(self):
        selected = select_exercises(("upper_arms",), ("elbows",))

        self.assertNotIn("seated-biceps-curl", selected)

    def test_constraint_does_not_remove_an_exercise_that_does_not_need_part(self):
        selected = select_exercises(("knees",), ("thighs",))

        self.assertNotIn("seated-knee-extension", selected)
        self.assertIn("sit-to-stand", selected)
        self.assertIn("supine-heel-slide", selected)

    def test_returns_empty_list_without_a_target(self):
        self.assertEqual(select_exercises(()), [])

    def test_supports_a_dictionary_of_custom_exercise_masks(self):
        custom_masks = {
            "safe-knee-move": {
                "target": body_part_mask(("knees",)),
                "required": body_part_mask(("knees",)),
            },
            "hip-assisted-knee-move": {
                "target": body_part_mask(("knees",)),
                "required": body_part_mask(("knees", "hips")),
            },
        }

        self.assertEqual(
            select_exercises(("knees",), ("hips",), custom_masks),
            ["safe-knee-move"],
        )


if __name__ == "__main__":
    unittest.main()
