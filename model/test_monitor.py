import math
import unittest
from types import SimpleNamespace

from exercise_analyzer import ExercisePhase, MoveState
from exercise_catalog import EXERCISE_CATALOG
from exercise_monitor import (
    EXERCISE_ANGLE_MAP,
    ExerciseMonitor,
    available_exercises,
    resolve_exercise_id,
)


def landmark(x, y, z=0.0, visibility=1.0):
    return SimpleNamespace(x=x, y=y, z=z, visibility=visibility)


def left_elbow_pose(angle_degrees):
    angle_radians = math.radians(angle_degrees)
    landmarks = [landmark(0.0, 0.0) for _ in range(33)]
    landmarks[11] = landmark(1.0, 0.0, z=10.0)
    landmarks[13] = landmark(0.0, 0.0, z=-5.0)
    landmarks[15] = landmark(
        math.cos(angle_radians),
        math.sin(angle_radians),
        z=20.0,
    )
    return landmarks


def left_elbow_image_pose(angle_degrees, frame_size):
    width, height = frame_size
    elbow_x = width / 2.0
    elbow_y = height / 2.0
    limb_length = min(width, height) * 0.2
    shoulder_direction = math.radians(30.0)
    wrist_direction = shoulder_direction + math.radians(angle_degrees)
    landmarks = [landmark(0.0, 0.0) for _ in range(33)]
    landmarks[11] = landmark(
        (elbow_x + limb_length * math.cos(shoulder_direction)) / width,
        (elbow_y + limb_length * math.sin(shoulder_direction)) / height,
    )
    landmarks[13] = landmark(elbow_x / width, elbow_y / height)
    landmarks[15] = landmark(
        (elbow_x + limb_length * math.cos(wrist_direction)) / width,
        (elbow_y + limb_length * math.sin(wrist_direction)) / height,
    )
    return landmarks


class ExerciseAngleMapTest(unittest.TestCase):
    def test_every_catalog_exercise_has_a_monitoring_profile(self):
        self.assertEqual(set(EXERCISE_ANGLE_MAP), set(EXERCISE_CATALOG))
        self.assertEqual(available_exercises(), tuple(EXERCISE_CATALOG))

    def test_biceps_curl_retrieves_the_named_right_arm_coordinates(self):
        right_elbow = EXERCISE_ANGLE_MAP["biceps-curl"]["right_elbow"]

        self.assertEqual(
            right_elbow.body_parts,
            ("right_shoulder", "right_elbow", "right_wrist"),
        )
        self.assertEqual(right_elbow.landmark_indices, (12, 14, 16))

    def test_accepts_catalog_names_and_common_aliases(self):
        self.assertEqual(resolve_exercise_id("Squat"), "squat")
        self.assertEqual(resolve_exercise_id("bicep curls"), "biceps-curl")
        self.assertEqual(resolve_exercise_id("push_up"), "push-up")

    def test_rejects_an_unconfigured_exercise(self):
        with self.assertRaisesRegex(ValueError, "unsupported exercise"):
            resolve_exercise_id("flying")


class MultiJointExerciseMonitorTest(unittest.TestCase):
    def test_biceps_curl_uses_image_points_11_13_15_in_two_dimensions(self):
        image_landmarks = [landmark(0.0, 0.0) for _ in range(33)]
        image_landmarks[11] = landmark(1.0, 0.0, z=10.0)
        image_landmarks[13] = landmark(0.0, 0.0, z=-5.0)
        image_landmarks[15] = landmark(0.0, 1.0, z=20.0)
        monitor = ExerciseMonitor(
            "biceps-curl",
            total_sets=1,
            reps_per_set=1,
            side="left",
        )

        monitor.process_landmarks(image_landmarks, 0.0)

        self.assertEqual(
            monitor.angle_rules["left_elbow"].landmark_indices,
            (11, 13, 15),
        )
        self.assertAlmostEqual(monitor.joint_angles["left_elbow"], 90.0)
        self.assertEqual(monitor.body_coordinates["left_shoulder"].z, 0.0)

    def test_biceps_curl_counts_a_rep_from_image_landmark_angles(self):
        monitor = ExerciseMonitor(
            "biceps-curl",
            total_sets=1,
            reps_per_set=1,
            side="left",
        )

        self.assertFalse(monitor.process_landmarks(left_elbow_pose(45.0), 0.0))
        self.assertTrue(monitor.process_landmarks(left_elbow_pose(120.0), 0.1))

        self.assertAlmostEqual(monitor.joint_angles["left_elbow"], 120.0)
        self.assertEqual(monitor.tracker.reps_in_set, 1)
        self.assertEqual(monitor.tracker.phase, ExercisePhase.COMPLETE)

    def test_biceps_curl_corrects_for_a_widescreen_frame(self):
        frame_size = (1600, 900)
        monitor = ExerciseMonitor(
            "biceps-curl",
            total_sets=1,
            reps_per_set=1,
            side="left",
        )

        monitor.process_landmarks(
            left_elbow_image_pose(45.0, frame_size),
            0.0,
            frame_size=frame_size,
        )
        self.assertAlmostEqual(monitor.joint_angles["left_elbow"], 45.0)

        self.assertTrue(
            monitor.process_landmarks(
                left_elbow_image_pose(120.0, frame_size),
                0.1,
                frame_size=frame_size,
            )
        )
        self.assertAlmostEqual(monitor.joint_angles["left_elbow"], 120.0)
        self.assertEqual(monitor.tracker.reps_in_set, 1)

    def test_squat_monitors_both_hips_and_both_knees_together(self):
        monitor = ExerciseMonitor(
            "squat",
            total_sets=1,
            reps_per_set=1,
            rest_seconds=0.0,
        )
        self.assertEqual(
            set(monitor.angle_rules),
            {"left_knee", "right_knee", "left_hip", "right_hip"},
        )

        target_angles = {
            name: rule.target_angle_degrees
            for name, rule in monitor.angle_rules.items()
        }
        monitor.update_angles(target_angles, 0.0)
        self.assertEqual(monitor.tracker.move_state, MoveState.TARGET_REACHED)

        # Returning only the knees is not enough to complete the squat rep.
        knee_returns = {
            name: rule.return_angle_degrees + 0.1
            for name, rule in monitor.angle_rules.items()
            if name.endswith("knee")
        }
        self.assertFalse(monitor.update_angles(knee_returns, 0.1))
        self.assertEqual(monitor.tracker.reps_in_set, 0)

        hip_returns = {
            name: rule.return_angle_degrees + 0.1
            for name, rule in monitor.angle_rules.items()
            if name.endswith("hip")
        }
        self.assertTrue(monitor.update_angles(hip_returns, 0.2))
        self.assertEqual(monitor.tracker.reps_in_set, 1)
        self.assertEqual(monitor.tracker.phase, ExercisePhase.COMPLETE)

    def test_can_monitor_only_the_requested_anatomical_side(self):
        monitor = ExerciseMonitor(
            "bicep-curl",
            total_sets=1,
            reps_per_set=1,
            side="right",
        )

        self.assertEqual(set(monitor.angle_rules), {"right_elbow"})
        monitor.update_angles({"right_elbow": 60.0}, 0.0)
        self.assertTrue(monitor.update_angles({"right_elbow": 90.1}, 0.1))
        self.assertEqual(monitor.tracker.reps_in_set, 1)

    def test_missing_pose_keeps_motion_state_but_advances_rest_timer(self):
        monitor = ExerciseMonitor(
            "biceps-curl",
            total_sets=2,
            reps_per_set=1,
            rest_seconds=1.0,
            side="right",
        )
        monitor.update_angles({"right_elbow": 60.0}, 0.0)
        monitor.update_angles({"right_elbow": 90.1}, 0.1)
        self.assertEqual(monitor.tracker.phase, ExercisePhase.RESTING)

        monitor.process_missing_pose(1.1)

        self.assertEqual(monitor.body_coordinates, {})
        self.assertIsNone(monitor.joint_angles["right_elbow"])
        self.assertEqual(monitor.tracker.phase, ExercisePhase.ACTIVE)
        self.assertEqual(monitor.tracker.current_set, 2)


if __name__ == "__main__":
    unittest.main()
