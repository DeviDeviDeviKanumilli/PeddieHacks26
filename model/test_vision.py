import math
import unittest
from types import SimpleNamespace

from vision_model import get_angle, vector_angle


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
