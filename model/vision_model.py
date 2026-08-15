import math
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp


def get_default_model_path():
    return Path(__file__).with_name("pose_landmarker_lite.task")


def download_model(model_path=None):
    path = Path(model_path) if model_path is not None else get_default_model_path()

    if path.exists():
        return path

    model_url = (
        "https://storage.googleapis.com/mediapipe-models/"
        "pose_landmarker/pose_landmarker_lite/float16/latest/"
        "pose_landmarker_lite.task"
    )
    urllib.request.urlretrieve(model_url, str(path))
    return path


def create_pose_landmarker(model_path=None):
    path = Path(model_path) if model_path is not None else get_default_model_path()
    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(path)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    return mp.tasks.vision.PoseLandmarker.create_from_options(options)


def vector_angle(vector_1, vector_2):
    dot_product = vector_1[0] * vector_2[0] + vector_1[1] * vector_2[1]
    magnitude = math.hypot(*vector_1) * math.hypot(*vector_2)

    if magnitude == 0:
        return None

    cosine = max(-1.0, min(1.0, dot_product / magnitude))
    return math.degrees(math.acos(cosine))


def get_angle(
    pose_landmarks,
    frame_width,
    frame_height,
    visibility_threshold=0.5,
    landmark_indices=(11, 13, 15),
):
    """Return the angle formed by point 1, the vertex, and point 2."""
    if (
        len(landmark_indices) != 3
        or any(
            isinstance(index, bool) or not isinstance(index, int) or index < 0
            for index in landmark_indices
        )
        or len(set(landmark_indices)) != 3
    ):
        raise ValueError(
            "landmark_indices must contain three distinct non-negative integers"
        )

    try:
        point_1, vertex, point_2 = (
            pose_landmarks[index] for index in landmark_indices
        )
    except IndexError as error:
        raise ValueError("landmark index is outside the detected pose") from error

    if any(
        landmark.visibility < visibility_threshold
        for landmark in (point_1, vertex, point_2)
    ):
        return None

    # Pixel coordinates prevent the camera's aspect ratio from distorting the angle.
    vector_1 = (
        (point_1.x - vertex.x) * frame_width,
        (point_1.y - vertex.y) * frame_height,
    )
    vector_2 = (
        (point_2.x - vertex.x) * frame_width,
        (point_2.y - vertex.y) * frame_height,
    )
    return vector_angle(vector_1, vector_2)


def detect_pose(landmarker, frame, timestamp_ms):
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    media_pipe_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame,
    )
    return landmarker.detect_for_video(media_pipe_image, timestamp_ms)
