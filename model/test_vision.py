import math
import unittest
from types import SimpleNamespace

from vision_model import (
    BODY_PART_LANDMARKS,
    BodyCoordinate,
    body_part_indices,
    build_body_coordinate_map,
    get_angle,
    get_angle_from_coordinates,
    get_angles_from_coordinates,
    vector_angle,
)


def landmark(x, y, z, visibility=1.0):
    return SimpleNamespace(x=x, y=y, z=z, visibility=visibility)


class VectorAngleTest(unittest.TestCase):
    def test_returns_a_right_angle_in_three_dimensions(self):
        angle = vector_angle((1.0, 0.0, 0.0), (0.0, 1.0, 0.0))
        self.assertIsNotNone(angle)
        self.assertAlmostEqual(angle, 90.0)

    def test_uses_depth_so_foreshortened_2d_views_do_not_match_the_3d_angle(self):
        two_d = vector_angle((0.1, 0.0), (0.1, 1.0))
        three_d = vector_angle((0.1, 0.0, 1.0), (0.1, 1.0, 1.0))
        self.assertIsNotNone(two_d)
        self.assertIsNotNone(three_d)
        self.assertNotAlmostEqual(two_d, three_d)
        self.assertAlmostEqual(
            three_d,
            math.degrees(
                math.acos(
                    (0.1 * 0.1 + 1.0)
                    / (math.hypot(0.1, 0.0, 1.0) * math.hypot(0.1, 1.0, 1.0))
                )
            ),
        )


class WorldLandmarkAngleTest(unittest.TestCase):
    def test_measures_the_world_space_elbow_angle(self):
        world = [
            landmark(0.0, 0.0, 0.0),
            landmark(1.0, 0.0, 0.0),
            landmark(1.0, 1.0, 0.0),
        ]
        angle = get_angle(world, landmark_indices=(0, 1, 2))
        self.assertIsNotNone(angle)
        self.assertAlmostEqual(angle, 90.0)

    def test_keeps_depth_in_the_angle(self):
        world = [
            landmark(0.1, 0.0, 1.0),
            landmark(0.0, 0.0, 0.0),
            landmark(0.1, 1.0, 1.0),
        ]
        angle = get_angle(world, landmark_indices=(0, 1, 2))
        expected = vector_angle((0.1, 0.0, 1.0), (0.1, 1.0, 1.0))
        self.assertAlmostEqual(angle, expected)

    def test_uses_image_visibility_and_ignores_hidden_joints(self):
        world = [
            landmark(0.0, 0.0, 0.0),
            landmark(1.0, 0.0, 0.0),
            landmark(1.0, 1.0, 0.0),
        ]
        hidden = [
            landmark(0.0, 0.0, 0.0, visibility=0.2),
            landmark(1.0, 0.0, 0.0, visibility=0.9),
            landmark(1.0, 1.0, 0.0, visibility=0.9),
        ]
        self.assertIsNone(
            get_angle(
                world,
                visibility_landmarks=hidden,
                landmark_indices=(0, 1, 2),
            )
        )


class BodyCoordinateMapTest(unittest.TestCase):
    def test_maps_named_body_parts_to_current_world_coordinates(self):
        world = [
            landmark(float(index), index + 0.1, index + 0.2)
            for index in range(33)
        ]
        image = [landmark(0.0, 0.0, 0.0, visibility=0.9) for _ in range(33)]

        coordinates = build_body_coordinate_map(world, image)

        self.assertEqual(len(coordinates), len(BODY_PART_LANDMARKS))
        self.assertEqual(
            coordinates["right_elbow"],
            BodyCoordinate(14.0, 14.1, 14.2, 0.9),
        )
        self.assertEqual(
            body_part_indices(
                ("right_shoulder", "right_elbow", "right_wrist")
            ),
            (12, 14, 16),
        )

    def test_calculates_multiple_named_angles_from_the_same_map(self):
        coordinates = {
            "right_hip": BodyCoordinate(0.0, -1.0, 0.0, 1.0),
            "right_shoulder": BodyCoordinate(0.0, 0.0, 0.0, 1.0),
            "right_elbow": BodyCoordinate(1.0, 0.0, 0.0, 1.0),
            "right_wrist": BodyCoordinate(1.0, 1.0, 0.0, 1.0),
        }

        angles = get_angles_from_coordinates(
            coordinates,
            {
                "right_shoulder": (
                    "right_hip",
                    "right_shoulder",
                    "right_elbow",
                ),
                "right_elbow": (
                    "right_shoulder",
                    "right_elbow",
                    "right_wrist",
                ),
            },
        )

        self.assertEqual(set(angles), {"right_shoulder", "right_elbow"})
        self.assertAlmostEqual(angles["right_shoulder"], 90.0)
        self.assertAlmostEqual(angles["right_elbow"], 90.0)

    def test_hidden_or_missing_coordinates_do_not_produce_an_angle(self):
        hidden = {
            "right_shoulder": BodyCoordinate(0.0, 0.0, 0.0, 1.0),
            "right_elbow": BodyCoordinate(1.0, 0.0, 0.0, 0.2),
            "right_wrist": BodyCoordinate(1.0, 1.0, 0.0, 1.0),
        }
        body_parts = ("right_shoulder", "right_elbow", "right_wrist")

        self.assertIsNone(get_angle_from_coordinates(hidden, body_parts))
        self.assertIsNone(
            get_angle_from_coordinates(
                {
                    name: value
                    for name, value in hidden.items()
                    if name != "right_wrist"
                },
                body_parts,
            )
        )
