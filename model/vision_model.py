import cv2
import mediapipe as mp
import math
import time
import os
import urllib.request

MODEL_PATH = "pose_landmarker_lite.task"

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_lite/float16/latest/"
    "pose_landmarker_lite.task"
)

CAMERA_ID = 0

# Ignore landmarks whose visibility is below this value
VISIBILITY_THRESHOLD = 0.5

# Landmarks used for the left-arm angle
ANGLE_POINT_1 = 11
ANGLE_VERTEX = 13
ANGLE_POINT_2 = 15

def download_model():
    if os.path.exists(MODEL_PATH):
        return

    print("Downloading MediaPipe Pose Landmarker model...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded:", MODEL_PATH)

def calculate_vector_angle(pose_landmarks, frame_width, frame_height):
    """Return the angle between vectors 11->13 and 13->15 in degrees."""
    point_1 = pose_landmarks[ANGLE_POINT_1]
    vertex = pose_landmarks[ANGLE_VERTEX]
    point_2 = pose_landmarks[ANGLE_POINT_2]

    if any(
        landmark.visibility < VISIBILITY_THRESHOLD
        for landmark in (point_1, vertex, point_2)
    ):
        return None

    # Calculate in pixel coordinates so the camera's aspect ratio does not
    # distort the angle.
    vector_1 = (
        (vertex.x - point_1.x) * frame_width,
        (vertex.y - point_1.y) * frame_height,
    )
    vector_2 = (
        (point_2.x - vertex.x) * frame_width,
        (point_2.y - vertex.y) * frame_height,
    )

    magnitude_1 = math.hypot(*vector_1)
    magnitude_2 = math.hypot(*vector_2)

    if magnitude_1 == 0 or magnitude_2 == 0:
        return None

    cosine = (
        vector_1[0] * vector_2[0] + vector_1[1] * vector_2[1]
    ) / (magnitude_1 * magnitude_2)

    # Clamp for small floating-point errors before calling acos.
    cosine = max(-1.0, min(1.0, cosine))
    return math.degrees(math.acos(cosine))

def draw_pose(frame, pose_landmarks):
    if not pose_landmarks:
        return frame

    height, width, _ = frame.shape

    # MediaPipe's official pose skeleton connections
    connections = (
        mp.tasks.vision.PoseLandmarksConnections.POSE_LANDMARKS
    )

    # Draw skeleton lines
    for connection in connections:
        start = pose_landmarks[connection.start]
        end = pose_landmarks[connection.end]

        if (
            start.visibility < VISIBILITY_THRESHOLD
            or end.visibility < VISIBILITY_THRESHOLD
        ):
            continue

        x1 = int(start.x * width)
        y1 = int(start.y * height)

        x2 = int(end.x * width)
        y2 = int(end.y * height)

        cv2.line(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            3,
        )

    # Draw landmark points
    for index, landmark in enumerate(pose_landmarks):

        if landmark.visibility < VISIBILITY_THRESHOLD:
            continue

        x = int(landmark.x * width)
        y = int(landmark.y * height)

        cv2.circle(
            frame,
            (x, y),
            5,
            (0, 0, 255),
            -1,
        )

        # Show landmark number
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


# ------------------------------------------------------------
# Main program
# ------------------------------------------------------------

def main():

    download_model()

    # Create MediaPipe Pose Landmarker
    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    RunningMode = mp.tasks.vision.RunningMode

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(
            model_asset_path=MODEL_PATH
        ),
        running_mode=RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    # Open webcam
    camera = cv2.VideoCapture(CAMERA_ID)

    if not camera.isOpened():
        print("ERROR: Could not open camera.")
        print("Try changing CAMERA_ID from 0 to 1.")
        return

    # Optional camera resolution
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    previous_time = time.time()
    last_timestamp_ms = 0

    print()
    print("MediaPipe Pose Camera started.")
    print("Press Q or ESC to quit.")
    print()

    with PoseLandmarker.create_from_options(options) as landmarker:

        while True:

            success, frame = camera.read()

            if not success:
                print("Could not read frame from camera.")
                break

            # Mirror the webcam image so it behaves like a mirror
            frame = cv2.flip(frame, 1)

            # OpenCV uses BGR; MediaPipe expects RGB
            rgb_frame = cv2.cvtColor(
                frame,
                cv2.COLOR_BGR2RGB,
            )

            # Convert numpy image to MediaPipe Image
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb_frame,
            )

            # MediaPipe VIDEO mode requires increasing timestamps
            timestamp_ms = int(time.monotonic() * 1000)

            if timestamp_ms <= last_timestamp_ms:
                timestamp_ms = last_timestamp_ms + 1

            last_timestamp_ms = timestamp_ms

            # Run pose estimation
            result = landmarker.detect_for_video(
                mp_image,
                timestamp_ms,
            )

            # Draw pose
            arm_angle = None

            if result.pose_landmarks:

                for pose_landmarks in result.pose_landmarks:
                    frame = draw_pose(
                        frame,
                        pose_landmarks,
                    )
                    arm_angle = calculate_vector_angle(
                        pose_landmarks,
                        frame.shape[1],
                        frame.shape[0],
                    )

                status = "POSE DETECTED"
                status_color = (0, 255, 0)

            else:
                status = "NO POSE"
                status_color = (0, 0, 255)

            # ------------------------------------------------
            # FPS calculation
            # ------------------------------------------------

            current_time = time.time()

            fps = 1 / max(
                current_time - previous_time,
                0.0001,
            )

            previous_time = current_time

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

            # ------------------------------------------------
            # Display
            # ------------------------------------------------

            cv2.imshow(
                "MediaPipe Live Pose Estimator",
                frame,
            )

            key = cv2.waitKey(1) & 0xFF

            if key == ord("q") or key == 27:
                break

    camera.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
