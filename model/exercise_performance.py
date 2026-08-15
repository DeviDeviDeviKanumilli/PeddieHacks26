"""Derived exercise-performance measurements.

This module only works with angles. It does not retain camera frames or pose
landmarks, which keeps the resulting data safe to pass to the backend.
"""

from dataclasses import dataclass
from math import isfinite
from typing import Iterable


@dataclass(frozen=True)
class RangeOfMotionStats:
    """Summary of the valid arm-angle samples for one exercise session."""

    sample_count: int
    mean_angle_degrees: float
    min_angle_degrees: float
    max_angle_degrees: float
    range_of_motion_degrees: float


class RangeOfMotionTracker:
    """Track arm range of motion for one person doing one exercise."""

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        """Discard all samples so the tracker can start a new session."""
        self._sample_count = 0
        self._mean_angle = 0.0
        self._min_angle: float | None = None
        self._max_angle: float | None = None

    def add_angle(self, angle_degrees: float | None) -> bool:
        """Add one elbow-angle sample.

        ``None`` is ignored because it represents a frame where the arm was not
        detected confidently. Other values must be finite angles from 0 to 180
        degrees.

        Returns ``True`` when a sample was accepted and ``False`` for ``None``.
        """
        if angle_degrees is None:
            return False

        angle = float(angle_degrees)
        if not isfinite(angle) or not 0.0 <= angle <= 180.0:
            raise ValueError("angle_degrees must be between 0 and 180")

        self._sample_count += 1
        self._mean_angle += (angle - self._mean_angle) / self._sample_count
        self._min_angle = (
            angle if self._min_angle is None else min(self._min_angle, angle)
        )
        self._max_angle = (
            angle if self._max_angle is None else max(self._max_angle, angle)
        )
        return True

    def get_stats(self) -> RangeOfMotionStats | None:
        """Return current statistics, or ``None`` when no angle was recorded."""
        if self._min_angle is None or self._max_angle is None:
            return None

        return RangeOfMotionStats(
            sample_count=self._sample_count,
            mean_angle_degrees=self._mean_angle,
            min_angle_degrees=self._min_angle,
            max_angle_degrees=self._max_angle,
            range_of_motion_degrees=self._max_angle - self._min_angle,
        )


def calculate_range_of_motion(
    angles_degrees: Iterable[float | None],
) -> RangeOfMotionStats | None:
    """Calculate ROM statistics for a completed sequence of arm angles."""
    tracker = RangeOfMotionTracker()
    for angle in angles_degrees:
        tracker.add_angle(angle)
    return tracker.get_stats()
