import math
import urllib.request
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path


# MediaPipe Pose Landmarker indices. Exercise definitions use these names rather
# than embedding numeric landmark indices throughout the monitoring code.
BODY_PART_LANDMARKS: dict[str, int] = {
    "nose": 0,
    "left_eye_inner": 1,
    "left_eye": 2,
    "left_eye_outer": 3,
    "right_eye_inner": 4,
    "right_eye": 5,
    "right_eye_outer": 6,
    "left_ear": 7,
    "right_ear": 8,
    "mouth_left": 9,
    "mouth_right": 10,
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_pinky": 17,
    "right_pinky": 18,
    "left_index": 19,
    "right_index": 20,
    "left_thumb": 21,
    "right_thumb": 22,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
    "left_heel": 29,
    "right_heel": 30,
    "left_foot_index": 31,
    "right_foot_index": 32,
}


@dataclass(frozen=True)
class BodyCoordinate:
    """One body part's current coordinate and visibility."""

    x: float
    y: float
    z: float
    visibility: float


def _validate_body_parts(body_parts):
    if (
        len(body_parts) != 3
        or any(not isinstance(name, str) or not name for name in body_parts)
        or len(set(body_parts)) != 3
    ):
        raise ValueError("body_parts must contain three distinct names")

    unknown_parts = set(body_parts) - set(BODY_PART_LANDMARKS)
    if unknown_parts:
        raise ValueError(f"unknown body parts: {sorted(unknown_parts)}")


def body_part_indices(body_parts):
    """Resolve a named point/vertex/point angle definition to MediaPipe indices."""
    _validate_body_parts(body_parts)
    return tuple(BODY_PART_LANDMARKS[name] for name in body_parts)


def build_body_coordinate_map(
    landmarks,
    visibility_landmarks=None,
    include_depth=True,
    image_size=None,
):
    """Build the current frame's named body-coordinate map.

    Set ``include_depth`` to False for 2D image-space vector math. Pass
    ``image_size=(width, height)`` to convert normalized image coordinates into
    pixels and avoid aspect-ratio distortion. When a separate visibility source
    is supplied, its visibility score is stored with the coordinates. Missing
    tail landmarks are absent from the result.
    """
    if not isinstance(include_depth, bool):
        raise TypeError("include_depth must be a boolean")
    if image_size is None:
        x_scale = 1.0
        y_scale = 1.0
    else:
        if len(image_size) != 2:
            raise ValueError("image_size must contain width and height")
        x_scale, y_scale = (float(value) for value in image_size)
        if (
            not math.isfinite(x_scale)
            or not math.isfinite(y_scale)
            or x_scale <= 0.0
            or y_scale <= 0.0
        ):
            raise ValueError("image width and height must be positive and finite")
    visibility_source = (
        landmarks if visibility_landmarks is None else visibility_landmarks
    )
    coordinates = {}

    for body_part, index in BODY_PART_LANDMARKS.items():
        try:
            landmark = landmarks[index]
            visibility_landmark = visibility_source[index]
        except IndexError:
            continue

        coordinates[body_part] = BodyCoordinate(
            x=float(landmark.x) * x_scale,
            y=float(landmark.y) * y_scale,
            z=float(landmark.z) if include_depth else 0.0,
            visibility=float(_landmark_visibility(visibility_landmark)),
        )

    return coordinates


def get_angle_from_coordinates(
    coordinate_map: Mapping[str, BodyCoordinate],
    body_parts,
    visibility_threshold=0.5,
):
    """Calculate a named point/vertex/point angle from a coordinate map."""
    _validate_body_parts(body_parts)
    threshold = float(visibility_threshold)
    if not math.isfinite(threshold) or not 0.0 <= threshold <= 1.0:
        raise ValueError("visibility_threshold must be between 0 and 1")

    coordinates = tuple(coordinate_map.get(name) for name in body_parts)
    if any(coordinate is None for coordinate in coordinates):
        return None

    point_1, vertex, point_2 = coordinates
    if any(
        coordinate.visibility < threshold
        or not all(
            math.isfinite(value)
            for value in (coordinate.x, coordinate.y, coordinate.z)
        )
        for coordinate in coordinates
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


def get_angles_from_coordinates(
    coordinate_map: Mapping[str, BodyCoordinate],
    angle_body_parts: Mapping[str, tuple[str, str, str]],
    visibility_threshold=0.5,
):
    """Calculate any number of named joint angles from one pose frame."""
    if any(not isinstance(name, str) or not name for name in angle_body_parts):
        raise ValueError("angle names must be non-empty strings")

    return {
        angle_name: get_angle_from_coordinates(
            coordinate_map,
            body_parts,
            visibility_threshold,
        )
        for angle_name, body_parts in angle_body_parts.items()
    }


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
