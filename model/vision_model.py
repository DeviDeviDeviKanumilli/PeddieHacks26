import math
import urllib.request
from pathlib import Path


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
    import mediapipe as mp

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
    if len(vector_1) != len(vector_2) or len(vector_1) < 2:
        raise ValueError("vectors must have the same length of at least 2")

    dot_product = sum(left * right for left, right in zip(vector_1, vector_2))
    magnitude = math.hypot(*vector_1) * math.hypot(*vector_2)

    if magnitude == 0:
        return None

    cosine = max(-1.0, min(1.0, dot_product / magnitude))
    return math.degrees(math.acos(cosine))


def _landmark_visibility(landmark):
    return getattr(landmark, "visibility", 1.0)


def get_angle(
    world_landmarks,
    visibility_landmarks=None,
    visibility_threshold=0.5,
    landmark_indices=(11, 13, 15),
):
    """Return the 3D world-landmark angle formed by point 1, the vertex, and point 2."""
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

    visibility_source = (
        world_landmarks if visibility_landmarks is None else visibility_landmarks
    )

    try:
        point_1, vertex, point_2 = (
            world_landmarks[index] for index in landmark_indices
        )
        visibility_points = tuple(
            visibility_source[index] for index in landmark_indices
        )
    except IndexError as error:
        raise ValueError("landmark index is outside the detected pose") from error

    if any(
        _landmark_visibility(landmark) < visibility_threshold
        for landmark in visibility_points
    ):
        return None

    vector_1 = (
        point_1.x - vertex.x,
        point_1.y - vertex.y,
        point_1.z - vertex.z,
    )
    vector_2 = (
        point_2.x - vertex.x,
        point_2.y - vertex.y,
        point_2.z - vertex.z,
    )
    return vector_angle(vector_1, vector_2)


def detect_pose(landmarker, frame, timestamp_ms):
    import cv2
    import mediapipe as mp

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    media_pipe_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame,
    )
    return landmarker.detect_for_video(media_pipe_image, timestamp_ms)
