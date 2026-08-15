import math
import unittest

from exercise_analyzer import (
    ExercisePhase,
    ExerciseSetTracker,
    ExerciseStats,
    MoveState,
    RangeOfMotionTracker,
    RepCounter,
    analyze_exercise,
    format_exercise_stats,
)


class RangeOfMotionTrackerTest(unittest.TestCase):
    def test_calculates_mean_min_max_and_range(self):
        tracker = RangeOfMotionTracker()
        for angle in (120.0, 60.0, 90.0):
            tracker.add_angle(angle)
        stats = tracker.get_stats()

        self.assertIsNotNone(stats)
        assert stats is not None
        self.assertEqual(stats.sample_count, 3)
        self.assertAlmostEqual(stats.mean_angle_degrees, 90.0)
        self.assertEqual(stats.min_angle_degrees, 60.0)
        self.assertEqual(stats.max_angle_degrees, 120.0)
        self.assertEqual(stats.range_of_motion_degrees, 60.0)

    def test_ignores_missing_detection(self):
        tracker = RangeOfMotionTracker()
        for angle in (None, 45.0, None):
            tracker.add_angle(angle)
        stats = tracker.get_stats()

        self.assertIsNotNone(stats)
        assert stats is not None
        self.assertEqual(stats.sample_count, 1)
        self.assertEqual(stats.mean_angle_degrees, 45.0)

    def test_returns_none_without_valid_samples(self):
        tracker = RangeOfMotionTracker()
        tracker.add_angle(None)
        tracker.add_angle(None)

        self.assertIsNone(tracker.get_stats())

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


class RepCounterTest(unittest.TestCase):
    def make_bicep_curl_counter(self):
        return RepCounter(
            landmark_indices=(11, 13, 15),
            target_angle_degrees=40.0,
            return_angle_degrees=160.0,
        )

    def test_starts_in_start_state_with_zero_reps(self):
        counter = self.make_bicep_curl_counter()

        self.assertEqual(counter.state, MoveState.START)
        self.assertEqual(counter.rep_count, 0)
        self.assertEqual(counter.landmark_indices, (11, 13, 15))

    def test_counts_decreasing_then_increasing_angle_rep(self):
        counter = self.make_bicep_curl_counter()

        self.assertFalse(counter.update(180.0))
        self.assertFalse(counter.update(40.0))
        self.assertEqual(counter.state, MoveState.TARGET_REACHED)
        self.assertFalse(counter.update(160.0))
        self.assertTrue(counter.update(160.1))

        self.assertEqual(counter.state, MoveState.START)
        self.assertEqual(counter.rep_count, 1)

    def test_counts_increasing_then_decreasing_angle_rep(self):
        counter = RepCounter(
            landmark_indices=(23, 25, 27),
            target_angle_degrees=160.0,
            return_angle_degrees=40.0,
        )

        self.assertFalse(counter.update(160.0))
        self.assertEqual(counter.state, MoveState.TARGET_REACHED)
        self.assertFalse(counter.update(40.0))
        self.assertTrue(counter.update(39.9))

        self.assertEqual(counter.state, MoveState.START)
        self.assertEqual(counter.rep_count, 1)

    def test_does_not_double_count_while_at_start(self):
        counter = self.make_bicep_curl_counter()

        for angle in (40.0, 170.0, 175.0, 180.0):
            counter.update(angle)

        self.assertEqual(counter.rep_count, 1)
        self.assertEqual(counter.state, MoveState.START)

    def test_counts_multiple_complete_cycles(self):
        counter = self.make_bicep_curl_counter()

        for angle in (180.0, 40.0, 170.0, 100.0, 35.0, 165.0):
            counter.update(angle)

        self.assertEqual(counter.rep_count, 2)

    def test_missing_detection_does_not_change_state(self):
        counter = self.make_bicep_curl_counter()
        counter.update(40.0)

        self.assertFalse(counter.update(None))
        self.assertEqual(counter.state, MoveState.TARGET_REACHED)
        self.assertEqual(counter.rep_count, 0)

    def test_reset_returns_to_initial_state(self):
        counter = self.make_bicep_curl_counter()
        counter.update(40.0)
        counter.update(170.0)

        counter.reset()

        self.assertEqual(counter.state, MoveState.START)
        self.assertEqual(counter.rep_count, 0)

    def test_rejects_invalid_landmarks_thresholds_and_angles(self):
        invalid_arguments = (
            ((11, 13), 40.0, 160.0),
            ((11, 11, 15), 40.0, 160.0),
            ((11, 13, 15), 40.0, 40.0),
            ((11, 13, 15), -1.0, 160.0),
            ((11, 13, 15), 40.0, 181.0),
        )
        for arguments in invalid_arguments:
            with self.subTest(arguments=arguments):
                with self.assertRaises(ValueError):
                    RepCounter(*arguments)

        counter = self.make_bicep_curl_counter()
        for angle in (-0.1, 180.1, math.inf, math.nan):
            with self.subTest(angle=angle):
                with self.assertRaises(ValueError):
                    counter.update(angle)


class ExerciseSetTrackerTest(unittest.TestCase):
    def make_tracker(
        self,
        total_sets=2,
        reps_per_set=1,
        rest_seconds=5.0,
    ):
        return ExerciseSetTracker(
            limb_counters={
                "left": RepCounter((11, 13, 15), 40.0, 160.0),
                "right": RepCounter((12, 14, 16), 40.0, 160.0),
            },
            total_sets=total_sets,
            reps_per_set=reps_per_set,
            rest_seconds=rest_seconds,
        )

    def test_requires_both_limbs_to_complete_an_overall_rep(self):
        tracker = self.make_tracker(reps_per_set=2)

        tracker.update({"left": 40.0, "right": 40.0}, 0.0)
        self.assertEqual(tracker.move_state, MoveState.TARGET_REACHED)

        self.assertFalse(tracker.update({"left": 170.0, "right": 100.0}, 0.1))
        self.assertEqual(tracker.reps_in_set, 0)
        self.assertTrue(tracker.update({"left": 170.0, "right": 170.0}, 0.2))
        self.assertEqual(tracker.reps_in_set, 1)

    def test_rest_period_then_starts_next_set(self):
        tracker = self.make_tracker(rest_seconds=1.5)

        tracker.update({"left": 40.0, "right": 40.0}, 0.0)
        tracker.update({"left": 170.0, "right": 170.0}, 0.1)

        self.assertEqual(tracker.phase, ExercisePhase.RESTING)
        self.assertEqual(tracker.current_set, 1)
        self.assertAlmostEqual(tracker.rest_remaining_seconds(0.1), 1.5)

        tracker.update({}, 1.59)
        self.assertEqual(tracker.phase, ExercisePhase.RESTING)
        tracker.update({}, 1.6)

        self.assertEqual(tracker.phase, ExercisePhase.ACTIVE)
        self.assertEqual(tracker.current_set, 2)
        self.assertEqual(tracker.reps_in_set, 0)

    def test_completes_after_final_set(self):
        tracker = self.make_tracker(total_sets=1)

        tracker.update({"left": 40.0, "right": 40.0}, 10.0)
        tracker.update({"left": 170.0, "right": 170.0}, 10.5)

        self.assertEqual(tracker.phase, ExercisePhase.COMPLETE)
        self.assertEqual(tracker.current_set, 1)
        self.assertEqual(tracker.reps_in_set, 1)
        self.assertEqual(tracker.completed_at_seconds, 10.5)

    def test_reset_restarts_the_whole_exercise(self):
        tracker = self.make_tracker(total_sets=1)
        tracker.update({"left": 40.0, "right": 40.0}, 0.0)
        tracker.update({"left": 170.0, "right": 170.0}, 0.1)

        tracker.reset()

        self.assertEqual(tracker.phase, ExercisePhase.ACTIVE)
        self.assertEqual(tracker.current_set, 1)
        self.assertEqual(tracker.reps_in_set, 0)
        self.assertIsNone(tracker.completed_at_seconds)

    def test_rejects_invalid_configuration_and_unknown_limbs(self):
        counter = RepCounter((11, 13, 15), 40.0, 160.0)
        invalid_arguments = (
            ({}, 1, 1, 5.0),
            ({"left": object()}, 1, 1, 5.0),
            ({"left": counter}, 0, 1, 5.0),
            ({"left": counter}, 1, 0, 5.0),
            ({"left": counter}, 1, 1, -1.0),
        )
        for arguments in invalid_arguments:
            with self.subTest(arguments=arguments):
                with self.assertRaises(ValueError):
                    ExerciseSetTracker(*arguments)

        tracker = self.make_tracker()
        with self.assertRaises(ValueError):
            tracker.update({"middle": 90.0}, 0.0)


class ExerciseAnalysisTest(unittest.TestCase):
    def make_tracker(self, total_sets=2, reps_per_set=2, rest_seconds=1.0):
        return ExerciseSetTracker(
            limb_counters={
                "left": RepCounter((11, 13, 15), 40.0, 160.0),
                "right": RepCounter((12, 14, 16), 40.0, 160.0),
            },
            total_sets=total_sets,
            reps_per_set=reps_per_set,
            rest_seconds=rest_seconds,
        )

    def complete_rep(self, tracker, start_seconds):
        tracker.update({"left": 40.0, "right": 40.0}, start_seconds)
        tracker.update(
            {"left": 170.0, "right": 170.0},
            start_seconds + 0.1,
        )

    def test_analyzes_partial_session_and_motion(self):
        tracker = self.make_tracker()
        self.complete_rep(tracker, 0.0)
        motion_trackers = {
            "left": RangeOfMotionTracker(),
            "right": RangeOfMotionTracker(),
        }
        for angle in (120.0, 60.0, 90.0):
            motion_trackers["left"].add_angle(angle)

        stats = analyze_exercise(
            "seated-biceps-curl",
            12.5,
            tracker,
            motion_trackers,
        )

        self.assertIsInstance(stats, ExerciseStats)
        self.assertEqual(stats.exercise_name, "seated-biceps-curl")
        self.assertEqual(stats.exercise_time_seconds, 12.5)
        self.assertEqual(stats.phase, ExercisePhase.ACTIVE)
        self.assertEqual(stats.sets_completed, 0)
        self.assertEqual(stats.sets_planned, 2)
        self.assertEqual(stats.reps_completed, 1)
        left_stats = stats.motion_stats["left"]
        self.assertIsNotNone(left_stats)
        assert left_stats is not None
        self.assertEqual(left_stats.sample_count, 3)
        self.assertEqual(left_stats.range_of_motion_degrees, 60.0)
        self.assertIsNone(stats.motion_stats["right"])

    def test_counts_completed_sets_and_reps(self):
        tracker = self.make_tracker(total_sets=2, reps_per_set=1)
        self.complete_rep(tracker, 0.0)

        resting_stats = analyze_exercise("curl", 1.0, tracker, {})
        self.assertEqual(resting_stats.phase, ExercisePhase.RESTING)
        self.assertEqual(resting_stats.sets_completed, 1)
        self.assertEqual(resting_stats.reps_completed, 1)

        tracker.update({}, 1.1)
        self.complete_rep(tracker, 1.2)
        completed_stats = analyze_exercise("curl", 2.0, tracker, {})

        self.assertEqual(completed_stats.phase, ExercisePhase.COMPLETE)
        self.assertEqual(completed_stats.sets_completed, 2)
        self.assertEqual(completed_stats.reps_completed, 2)

    def test_formats_stats_for_terminal_output(self):
        tracker = self.make_tracker(total_sets=1, reps_per_set=1)
        self.complete_rep(tracker, 0.0)
        motion_tracker = RangeOfMotionTracker()
        motion_tracker.add_angle(50.0)
        motion_tracker.add_angle(110.0)

        output = format_exercise_stats(
            analyze_exercise("curl", 4.25, tracker, {"left": motion_tracker})
        )

        self.assertIn("Exercise: curl", output)
        self.assertIn("Exercise time: 4.25 seconds", output)
        self.assertIn("Sets completed: 1/1", output)
        self.assertIn("Reps completed: 1", output)
        self.assertIn("ROM=60.00 deg", output)

    def test_rejects_invalid_analysis_inputs(self):
        tracker = self.make_tracker()

        with self.assertRaises(ValueError):
            analyze_exercise("", 1.0, tracker, {})
        with self.assertRaises(ValueError):
            analyze_exercise("curl", -1.0, tracker, {})
        with self.assertRaises(ValueError):
            analyze_exercise("curl", math.inf, tracker, {})
        with self.assertRaises(TypeError):
            analyze_exercise("curl", 1.0, object(), {})
        with self.assertRaises(ValueError):
            analyze_exercise("curl", 1.0, tracker, {"left": object()})


if __name__ == "__main__":
    unittest.main()
