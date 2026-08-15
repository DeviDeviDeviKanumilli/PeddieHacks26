import math
import unittest

from exercise_performance import RangeOfMotionTracker, calculate_range_of_motion


class RangeOfMotionTrackerTest(unittest.TestCase):
    def test_calculates_mean_min_max_and_range(self):
        stats = calculate_range_of_motion([120.0, 60.0, 90.0])

        self.assertIsNotNone(stats)
        assert stats is not None
        self.assertEqual(stats.sample_count, 3)
        self.assertAlmostEqual(stats.mean_angle_degrees, 90.0)
        self.assertEqual(stats.min_angle_degrees, 60.0)
        self.assertEqual(stats.max_angle_degrees, 120.0)
        self.assertEqual(stats.range_of_motion_degrees, 60.0)

    def test_ignores_missing_detection(self):
        stats = calculate_range_of_motion([None, 45.0, None])

        self.assertIsNotNone(stats)
        assert stats is not None
        self.assertEqual(stats.sample_count, 1)
        self.assertEqual(stats.mean_angle_degrees, 45.0)

    def test_returns_none_without_valid_samples(self):
        self.assertIsNone(calculate_range_of_motion([None, None]))

    def test_reset_starts_a_new_session(self):
        tracker = RangeOfMotionTracker()
        tracker.add_angle(30.0)
        tracker.reset()
        tracker.add_angle(150.0)

        stats = tracker.get_stats()
        self.assertIsNotNone(stats)
        assert stats is not None
        self.assertEqual(stats.sample_count, 1)
        self.assertEqual(stats.mean_angle_degrees, 150.0)

    def test_rejects_invalid_angles(self):
        tracker = RangeOfMotionTracker()

        for angle in (-0.1, 180.1, math.inf, math.nan):
            with self.subTest(angle=angle):
                with self.assertRaises(ValueError):
                    tracker.add_angle(angle)


if __name__ == "__main__":
    unittest.main()
