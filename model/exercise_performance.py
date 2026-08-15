from collections.abc import Mapping
from dataclasses import dataclass
from enum import Enum
from math import isfinite


@dataclass(frozen=True)
class RangeOfMotionStats:
    sample_count: int
    mean_angle_degrees: float
    min_angle_degrees: float
    max_angle_degrees: float
    range_of_motion_degrees: float


class RangeOfMotionTracker:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._sample_count = 0
        self._mean_angle = 0.0
        self._min_angle: float | None = None
        self._max_angle: float | None = None

    def add_angle(self, angle_degrees: float | None) -> bool:
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
        if self._min_angle is None or self._max_angle is None:
            return None

        return RangeOfMotionStats(
            sample_count=self._sample_count,
            mean_angle_degrees=self._mean_angle,
            min_angle_degrees=self._min_angle,
            max_angle_degrees=self._max_angle,
            range_of_motion_degrees=self._max_angle - self._min_angle,
        )


class MoveState(str, Enum):
    START = "START"
    TARGET_REACHED = "TARGET_REACHED"


class RepCounter:
    def __init__(
        self,
        landmark_indices: tuple[int, int, int],
        target_angle_degrees: float,
        return_angle_degrees: float,
    ) -> None:
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

        target_angle = float(target_angle_degrees)
        return_angle = float(return_angle_degrees)
        if (
            not isfinite(target_angle)
            or not isfinite(return_angle)
            or not 0.0 <= target_angle <= 180.0
            or not 0.0 <= return_angle <= 180.0
            or target_angle == return_angle
        ):
            raise ValueError(
                "target and return angles must be different values between 0 and 180"
            )

        self.landmark_indices = tuple(landmark_indices)
        self.target_angle_degrees = target_angle
        self.return_angle_degrees = return_angle
        self._target_is_lower = target_angle < return_angle
        self.reset()

    def reset(self) -> None:
        self._state = MoveState.START
        self._rep_count = 0

    @property
    def state(self) -> MoveState:
        return self._state

    @property
    def rep_count(self) -> int:
        return self._rep_count

    def update(self, angle_degrees: float | None) -> bool:
        """Update the state machine and return True when a rep is completed."""
        if angle_degrees is None:
            return False

        angle = float(angle_degrees)
        if not isfinite(angle) or not 0.0 <= angle <= 180.0:
            raise ValueError("angle_degrees must be between 0 and 180")

        target_reached = (
            angle <= self.target_angle_degrees
            if self._target_is_lower
            else angle >= self.target_angle_degrees
        )
        returned_to_start = (
            angle > self.return_angle_degrees
            if self._target_is_lower
            else angle < self.return_angle_degrees
        )

        if self._state is MoveState.START and target_reached:
            self._state = MoveState.TARGET_REACHED
            return False

        if self._state is MoveState.TARGET_REACHED and returned_to_start:
            self._state = MoveState.START
            self._rep_count += 1
            return True

        return False


class ExercisePhase(str, Enum):
    ACTIVE = "ACTIVE"
    RESTING = "RESTING"
    COMPLETE = "COMPLETE"


class ExerciseSetTracker:
    def __init__(
        self,
        limb_counters: Mapping[str, RepCounter],
        total_sets: int,
        reps_per_set: int,
        rest_seconds: float = 5.0,
    ) -> None:
        if not limb_counters or any(
            not isinstance(name, str) or not name.strip() for name in limb_counters
        ):
            raise ValueError("limb_counters must contain at least one named limb")
        if any(
            not isinstance(counter, RepCounter)
            for counter in limb_counters.values()
        ):
            raise ValueError("every limb counter must be a RepCounter")
        if (
            isinstance(total_sets, bool)
            or not isinstance(total_sets, int)
            or total_sets < 1
        ):
            raise ValueError("total_sets must be a positive integer")
        if (
            isinstance(reps_per_set, bool)
            or not isinstance(reps_per_set, int)
            or reps_per_set < 1
        ):
            raise ValueError("reps_per_set must be a positive integer")

        rest_duration = float(rest_seconds)
        if not isfinite(rest_duration) or rest_duration < 0.0:
            raise ValueError("rest_seconds must be a finite non-negative number")

        self.limb_counters = dict(limb_counters)
        self.total_sets = total_sets
        self.reps_per_set = reps_per_set
        self.rest_seconds = rest_duration
        self.reset()

    def reset(self) -> None:
        self._phase = ExercisePhase.ACTIVE
        self._current_set = 1
        self._reps_in_set = 0
        self._rest_ends_at_seconds: float | None = None
        self._completed_at_seconds: float | None = None
        for counter in self.limb_counters.values():
            counter.reset()

    @property
    def phase(self) -> ExercisePhase:
        return self._phase

    @property
    def current_set(self) -> int:
        return self._current_set

    @property
    def reps_in_set(self) -> int:
        return self._reps_in_set

    @property
    def move_state(self) -> MoveState:
        if self._phase is not ExercisePhase.ACTIVE:
            return MoveState.START
        if all(
            counter.state is MoveState.TARGET_REACHED
            for counter in self.limb_counters.values()
        ):
            return MoveState.TARGET_REACHED
        return MoveState.START

    @property
    def completed_at_seconds(self) -> float | None:
        return self._completed_at_seconds

    def rest_remaining_seconds(self, now_seconds: float) -> float:
        if (
            self._phase is not ExercisePhase.RESTING
            or self._rest_ends_at_seconds is None
        ):
            return 0.0
        return max(0.0, self._rest_ends_at_seconds - float(now_seconds))

    def update(
        self,
        joint_angles: Mapping[str, float | None],
        now_seconds: float,
    ) -> bool:
        """Update all limbs and return True when one exercise rep completes."""
        now = float(now_seconds)
        if not isfinite(now):
            raise ValueError("now_seconds must be finite")

        unknown_limbs = set(joint_angles) - set(self.limb_counters)
        if unknown_limbs:
            raise ValueError(f"unknown limbs: {sorted(unknown_limbs)}")

        if self._phase is ExercisePhase.COMPLETE:
            return False

        if self._phase is ExercisePhase.RESTING:
            if (
                self._rest_ends_at_seconds is not None
                and now >= self._rest_ends_at_seconds
            ):
                self._current_set += 1
                self._reps_in_set = 0
                self._rest_ends_at_seconds = None
                self._phase = ExercisePhase.ACTIVE
                for counter in self.limb_counters.values():
                    counter.reset()
            return False

        previous_reps = self._reps_in_set
        for limb_name, counter in self.limb_counters.items():
            counter.update(joint_angles.get(limb_name))

        self._reps_in_set = min(
            self.reps_per_set,
            min(counter.rep_count for counter in self.limb_counters.values()),
        )
        rep_completed = self._reps_in_set > previous_reps

        if self._reps_in_set == self.reps_per_set:
            if self._current_set == self.total_sets:
                self._phase = ExercisePhase.COMPLETE
                self._completed_at_seconds = now
            else:
                self._phase = ExercisePhase.RESTING
                self._rest_ends_at_seconds = now + self.rest_seconds

        return rep_completed
