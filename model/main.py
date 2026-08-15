import argparse
import time
from math import isfinite

import cv2
import mediapipe as mp

from exercise_analyzer import (
    ExercisePhase,
    ExerciseSetTracker,
    MoveState,
    RangeOfMotionTracker,
    RepCounter,
    analyze_exercise,
    format_exercise_stats,
)
from vision_model import (
    create_pose_landmarker,
    detect_pose,
    download_model,
    get_angle,
    get_default_model_path,
)

# Set this to True to draw pose lines and dots by default.
SHOW_POSE = False


def draw_pose(frame, pose_landmarks, visibility_threshold=0.5):
    if not pose_landmarks:
        return frame

    height, width, _ = frame.shape
    connections = mp.tasks.vision.PoseLandmarksConnections.POSE_LANDMARKS

    for connection in connections:
        start = pose_landmarks[connection.start]
        end = pose_landmarks[connection.end]

        if (
            start.visibility < visibility_threshold
            or end.visibility < visibility_threshold
        ):
            continue

        cv2.line(
            frame,
            (int(start.x * width), int(start.y * height)),
            (int(end.x * width), int(end.y * height)),
            (0, 255, 0),
            3,
        )

    for landmark in pose_landmarks:
        if landmark.visibility < visibility_threshold:
            continue

        x = int(landmark.x * width)
        y = int(landmark.y * height)

        cv2.circle(frame, (x, y), 5, (0, 0, 255), -1)

    return frame


def draw_centered_text(frame, text, color, font_scale=1.2, thickness=3):
    text_size, _ = cv2.getTextSize(
        text,
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale,
        thickness,
    )
    x = max(0, (frame.shape[1] - text_size[0]) // 2)
    y = max(text_size[1], (frame.shape[0] + text_size[1]) // 2)
    cv2.putText(
        frame,
        text,
        (x, y),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale,
        color,
        thickness,
        cv2.LINE_AA,
    )


def draw_status(frame, exercise_tracker: ExerciseSetTracker, now_seconds: float):
    green = (0, 255, 0)
    pink = (180, 105, 255)

    if exercise_tracker.phase is ExercisePhase.COMPLETE:
        draw_centered_text(frame, "exercise complete", green, 1.4, 3)
        return

    cv2.putText(
        frame,
        f"SETS: {exercise_tracker.current_set}/{exercise_tracker.total_sets}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
    cv2.putText(
        frame,
        f"REPS: {exercise_tracker.reps_in_set}/{exercise_tracker.reps_per_set}",
        (20, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )

    if exercise_tracker.phase is ExercisePhase.RESTING:
        remaining = exercise_tracker.rest_remaining_seconds(now_seconds)
        draw_centered_text(frame, f"rest: {remaining:.1f}s", pink)
        return

    good_form = exercise_tracker.move_state is MoveState.TARGET_REACHED
    cv2.putText(
        frame,
        "good form!" if good_form else "keep it up",
        (20, 125),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        green if good_form else pink,
        2,
        cv2.LINE_AA,
    )


def main(
    exercise_name="biceps-curl",
    total_sets=2,
    reps_per_set=2,
    rest_seconds=2.0,
    completion_display_seconds=2.0,
    left_landmarks=(11, 13, 15),
    right_landmarks=(12, 14, 16),
    target_angle_degrees=50.0,
    return_angle_degrees=160.0,
    show_pose=SHOW_POSE,
):
    completion_duration = float(completion_display_seconds)
    if not isfinite(completion_duration) or completion_duration < 0.0:
        raise ValueError(
            "completion_display_seconds must be a finite non-negative number"
        )

    limb_counters = {
        "left": RepCounter(
            tuple(left_landmarks),
            target_angle_degrees,
            return_angle_degrees,
        ),
        "right": RepCounter(
            tuple(right_landmarks),
            target_angle_degrees,
            return_angle_degrees,
        ),
    }
    exercise_tracker = ExerciseSetTracker(
        limb_counters=limb_counters,
        total_sets=total_sets,
        reps_per_set=reps_per_set,
        rest_seconds=rest_seconds,
    )
    range_of_motion_trackers = {
        limb_name: RangeOfMotionTracker() for limb_name in limb_counters
    }

    model_path = get_default_model_path()
    if not model_path.exists():
        print("Downloading MediaPipe Pose Landmarker model...")
        download_model(model_path)
        print("Model downloaded:", model_path)

    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        print("ERROR: Could not open camera.")
        print("Try changing the camera ID from 0 to 1.")
        return

    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    last_timestamp_ms = 0
    exercise_started_at_seconds = time.monotonic()

    print()
    print("MediaPipe Pose Camera started.")
    print("Press Q or ESC to quit.")
    print()

    try:
        with create_pose_landmarker(model_path) as landmarker:
            exercise_started_at_seconds = time.monotonic()
            while True:
                success, frame = camera.read()
                if not success:
                    print("Could not read frame from camera.")
                    break

                frame = cv2.flip(frame, 1)
                timestamp_ms = max(
                    int(time.monotonic() * 1000),
                    last_timestamp_ms + 1,
                )
                last_timestamp_ms = timestamp_ms
                result = detect_pose(landmarker, frame, timestamp_ms)

                joint_angles = {limb_name: None for limb_name in limb_counters}
                if result.pose_landmarks:
                    for pose_landmarks in result.pose_landmarks:
                        if show_pose:
                            draw_pose(frame, pose_landmarks)
                        for limb_name, counter in limb_counters.items():
                            joint_angles[limb_name] = get_angle(
                                pose_landmarks,
                                frame.shape[1],
                                frame.shape[0],
                                landmark_indices=counter.landmark_indices,
                            )

                now_seconds = time.monotonic()
                was_active = exercise_tracker.phase is ExercisePhase.ACTIVE
                exercise_tracker.update(joint_angles, now_seconds)
                if was_active:
                    for limb_name, angle in joint_angles.items():
                        range_of_motion_trackers[limb_name].add_angle(angle)

                draw_status(frame, exercise_tracker, now_seconds)
                cv2.imshow("MediaPipe Live Pose Estimator", frame)

                key = cv2.waitKey(1) & 0xFF
                if key == ord("q") or key == 27:
                    break

                completed_at = exercise_tracker.completed_at_seconds
                if (
                    completed_at is not None
                    and now_seconds - completed_at >= completion_duration
                ):
                    break
    finally:
        completed_at_seconds = exercise_tracker.completed_at_seconds
        exercise_ended_at_seconds = (
            completed_at_seconds
            if completed_at_seconds is not None
            else time.monotonic()
        )
        camera.release()
        cv2.destroyAllWindows()
        stats = analyze_exercise(
            exercise_name=exercise_name,
            exercise_time_seconds=(
                exercise_ended_at_seconds - exercise_started_at_seconds
            ),
            exercise_tracker=exercise_tracker,
            motion_trackers=range_of_motion_trackers,
        )
        print()
        print(format_exercise_stats(stats))


def positive_int(value):
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def non_negative_float(value):
    parsed = float(value)
    if not isfinite(parsed) or parsed < 0.0:
        raise argparse.ArgumentTypeError("must be finite and non-negative")
    return parsed


def parse_args():
    parser = argparse.ArgumentParser(description="Track a bilateral exercise")
    parser.add_argument("--exercise", default="biceps-curl")
    parser.add_argument("--sets", type=positive_int, default=2)
    parser.add_argument("--reps-per-set", type=positive_int, default=2)
    parser.add_argument("--rest-seconds", type=non_negative_float, default=2.0)
    parser.add_argument(
        "--completion-seconds",
        type=non_negative_float,
        default=2.0,
    )
    parser.add_argument("--left-points", type=int, nargs=3, default=(11, 13, 15))
    parser.add_argument("--right-points", type=int, nargs=3, default=(12, 14, 16))
    parser.add_argument("--target-angle", type=float, default=40.0)
    parser.add_argument("--return-angle", type=float, default=160.0)
    parser.add_argument(
        "--show-pose",
        action=argparse.BooleanOptionalAction,
        default=SHOW_POSE,
        help="draw pose lines and dots (default: hidden)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    main(
        exercise_name=arguments.exercise,
        total_sets=arguments.sets,
        reps_per_set=arguments.reps_per_set,
        rest_seconds=arguments.rest_seconds,
        completion_display_seconds=arguments.completion_seconds,
        left_landmarks=tuple(arguments.left_points),
        right_landmarks=tuple(arguments.right_points),
        target_angle_degrees=arguments.target_angle,
        return_angle_degrees=arguments.return_angle,
        show_pose=arguments.show_pose
        # show_pose=True
    )
