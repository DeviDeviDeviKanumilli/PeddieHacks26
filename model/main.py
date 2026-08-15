import time

import cv2
import mediapipe as mp

from exercise_performance import RangeOfMotionStats, RangeOfMotionTracker
from vision_model import (
    create_pose_landmarker,
    detect_pose,
    download_model,
    get_angle,
    get_default_model_path,
)


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

    for index, landmark in enumerate(pose_landmarks):
        if landmark.visibility < visibility_threshold:
            continue

        x = int(landmark.x * width)
        y = int(landmark.y * height)

        cv2.circle(frame, (x, y), 5, (0, 0, 255), -1)
        cv2.putText(
            frame,
            str(index),
            (x + 6, y - 6),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    return frame


def draw_status(
    frame,
    fps,
    status,
    status_color,
    arm_angle,
    range_of_motion_stats: RangeOfMotionStats | None,
):
    cv2.putText(
        frame,
        f"FPS: {fps:.1f}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
    cv2.putText(
        frame,
        status,
        (20, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        status_color,
        2,
        cv2.LINE_AA,
    )

    angle_text = (
        f"ANGLE 11-13-15: {arm_angle:.1f} deg"
        if arm_angle is not None
        else "ANGLE 11-13-15: --"
    )
    cv2.putText(
        frame,
        angle_text,
        (20, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 255),
        2,
        cv2.LINE_AA,
    )

    rom_text = (
        "ROM mean/min/max: "
        f"{range_of_motion_stats.mean_angle_degrees:.1f} / "
        f"{range_of_motion_stats.min_angle_degrees:.1f} / "
        f"{range_of_motion_stats.max_angle_degrees:.1f} deg"
        if range_of_motion_stats is not None
        else "ROM mean/min/max: --"
    )
    cv2.putText(
        frame,
        rom_text,
        (20, 160),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 255),
        2,
        cv2.LINE_AA,
    )


def main():
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

    previous_time = time.time()
    last_timestamp_ms = 0
    # Keep this local: each person/exercise session needs isolated measurements.
    range_of_motion_tracker = RangeOfMotionTracker()

    print()
    print("MediaPipe Pose Camera started.")
    print("Press Q or ESC to quit.")
    print()

    try:
        with create_pose_landmarker(model_path) as landmarker:
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

                arm_angle = None
                if result.pose_landmarks:
                    for pose_landmarks in result.pose_landmarks:
                        draw_pose(frame, pose_landmarks)
                        arm_angle = get_angle(
                            pose_landmarks,
                            frame.shape[1],
                            frame.shape[0],
                        )
                    status = "POSE DETECTED"
                    status_color = (0, 255, 0)
                else:
                    status = "NO POSE"
                    status_color = (0, 0, 255)

                range_of_motion_tracker.add_angle(arm_angle)
                range_of_motion_stats = range_of_motion_tracker.get_stats()

                current_time = time.time()
                fps = 1 / max(current_time - previous_time, 0.0001)
                previous_time = current_time

                draw_status(
                    frame,
                    fps,
                    status,
                    status_color,
                    arm_angle,
                    range_of_motion_stats,
                )
                cv2.imshow("MediaPipe Live Pose Estimator", frame)

                key = cv2.waitKey(1) & 0xFF
                if key == ord("q") or key == 27:
                    break
    finally:
        camera.release()
        cv2.destroyAllWindows()

        range_of_motion_stats = range_of_motion_tracker.get_stats()
        if range_of_motion_stats is not None:
            print()
            print("Exercise range-of-motion summary:")
            print(f"Samples: {range_of_motion_stats.sample_count}")
            print(
                f"Mean angle: {range_of_motion_stats.mean_angle_degrees:.1f} deg"
            )
            print(f"Min angle: {range_of_motion_stats.min_angle_degrees:.1f} deg")
            print(f"Max angle: {range_of_motion_stats.max_angle_degrees:.1f} deg")
            print(
                "Range of motion: "
                f"{range_of_motion_stats.range_of_motion_degrees:.1f} deg"
            )


if __name__ == "__main__":
    main()
