import argparse
import time
from math import isfinite

from exercise_analyzer import (
    ExercisePhase,
    ExerciseSetTracker,
    MoveState,
    analyze_exercise,
    format_exercise_stats,
)
from exercise_monitor import ExerciseMonitor, available_exercises
from vision_model import (
    create_pose_landmarker,
    detect_pose,
    download_model,
    get_default_model_path,
)

# Set this to True to draw pose lines and dots by default.
SHOW_POSE = True


def draw_pose(frame, pose_landmarks, visibility_threshold=0.5):
    import cv2
    import mediapipe as mp

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
    import cv2

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


def draw_status(
    frame,
    exercise_tracker: ExerciseSetTracker,
    now_seconds: float,
    joint_angles=None,
):
    import cv2

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

    if joint_angles:
        x = max(20, frame.shape[1] - 310)
        for row, (angle_name, angle) in enumerate(joint_angles.items()):
            angle_text = "--" if angle is None else f"{angle:5.1f} deg"
            cv2.putText(
                frame,
                f"{angle_name}: {angle_text}",
                (x, 40 + row * 32),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2,
                cv2.LINE_AA,
            )


def main(
    exercise_name="biceps-curl",
    total_sets=2,
    reps_per_set=2,
    rest_seconds=2.0,
    completion_display_seconds=2.0,
    side="both",
    target_angle_degrees=None,
    return_angle_degrees=None,
    show_pose=SHOW_POSE,
):
    completion_duration = float(completion_display_seconds)
    if not isfinite(completion_duration) or completion_duration < 0.0:
        raise ValueError(
            "completion_display_seconds must be a finite non-negative number"
        )

    exercise_monitor = ExerciseMonitor(
        exercise_name=exercise_name,
        total_sets=total_sets,
        reps_per_set=reps_per_set,
        rest_seconds=rest_seconds,
        side=side,
        target_angle_degrees=target_angle_degrees,
        return_angle_degrees=return_angle_degrees,
    )
    exercise_tracker = exercise_monitor.tracker

    try:
        import cv2
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "OpenCV is required for live camera monitoring; install cv2 first"
        ) from error

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
    print("Exercise:", exercise_monitor.exercise_name)
    print("Side labels are anatomical; the preview is mirrored.")
    print(
        "Monitoring:",
        ", ".join(
            f"{angle_name}={rule.landmark_indices}"
            for angle_name, rule in exercise_monitor.angle_rules.items()
        ),
    )
    print("Press Q or ESC to quit.")
    print()

    try:
        with create_pose_landmarker(model_path) as landmarker:
            exercise_started_at_seconds = time.monotonic()
            while True:
                success, camera_frame = camera.read()
                if not success:
                    print("Could not read frame from camera.")
                    break

                timestamp_ms = max(
                    int(time.monotonic() * 1000),
                    last_timestamp_ms + 1,
                )
                last_timestamp_ms = timestamp_ms
                # Detect on the unmirrored camera image so MediaPipe's left and
                # right landmark names retain their anatomical meaning. Mirror
                # only the preview below to preserve a selfie-style display.
                result = detect_pose(landmarker, camera_frame, timestamp_ms)

                now_seconds = time.monotonic()
                if result.pose_landmarks:
                    image_landmarks = result.pose_landmarks[0]
                    if show_pose:
                        draw_pose(camera_frame, image_landmarks)
                    exercise_monitor.process_landmarks(
                        image_landmarks,
                        now_seconds,
                        frame_size=(
                            camera_frame.shape[1],
                            camera_frame.shape[0],
                        ),
                    )
                else:
                    exercise_monitor.process_missing_pose(now_seconds)

                frame = cv2.flip(camera_frame, 1)
                draw_status(
                    frame,
                    exercise_tracker,
                    now_seconds,
                    exercise_monitor.joint_angles,
                )
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
            exercise_name=exercise_monitor.exercise_name,
            exercise_time_seconds=(
                exercise_ended_at_seconds - exercise_started_at_seconds
            ),
            exercise_tracker=exercise_tracker,
            motion_trackers=exercise_monitor.motion_trackers,
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
    parser = argparse.ArgumentParser(
        description="Track a configured exercise with named body-part angles"
    )
    parser.add_argument(
        "--exercise",
        default="biceps-curl",
        help=f"exercise name or id (available: {', '.join(available_exercises())})",
    )
    parser.add_argument(
        "--side",
        choices=("both", "left", "right"),
        default="both",
        help="monitor both sides or one anatomical side",
    )
    parser.add_argument("--sets", type=positive_int, default=1)
    parser.add_argument("--reps-per-set", type=positive_int, default=3)
    parser.add_argument("--rest-seconds", type=non_negative_float, default=3.0)
    parser.add_argument(
        "--completion-seconds",
        type=non_negative_float,
        default=2.0,
    )
    parser.add_argument(
        "--target-angle",
        type=float,
        default=None,
        help="override every configured target angle",
    )
    parser.add_argument(
        "--return-angle",
        type=float,
        default=None,
        help="override every configured return angle",
    )
    parser.add_argument(
        "--show-pose",
        action=argparse.BooleanOptionalAction,
        default=SHOW_POSE,
        help="draw pose lines and dots (default: visible)",
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
        side=arguments.side,
        target_angle_degrees=arguments.target_angle,
        return_angle_degrees=arguments.return_angle,
        # show_pose=arguments.show_pose
        show_pose=True,
    )
