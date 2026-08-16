import type { ExerciseRecipe, FeatureSample, MotionEvent, TrackerState } from './types.js';

export class RepetitionTracker {
  state: TrackerState = 'idle';
  setIndex = 1;
  acceptedReps = 0;
  private cycleStartedAt: number | null = null;

  constructor(private readonly recipe: ExerciseRecipe) {}

  start(atMs: number): MotionEvent[] {
    this.state = 'seeking_target';
    this.cycleStartedAt = atMs;
    return [];
  }

  ingest(feature: FeatureSample): MotionEvent[] {
    if (this.state === 'idle' || this.state === 'exercise_complete' || this.state === 'rest') {
      return [];
    }
    if (feature.confidence < this.recipe.confidenceGate) {
      return [
        {
          type: 'tracking_unavailable',
          atMs: feature.atMs,
          exerciseId: this.recipe.exerciseId,
          payload: { confidence: feature.confidence },
        },
      ];
    }
    if (this.state === 'seeking_target' && feature.angleDeg >= this.recipe.targetAngleDeg) {
      this.state = 'seeking_return';
      this.cycleStartedAt = feature.atMs;
      return [];
    }
    if (this.state === 'seeking_return' && feature.angleDeg <= this.recipe.returnAngleDeg) {
      const started = this.cycleStartedAt ?? feature.atMs;
      const duration = feature.atMs - started;
      if (duration < this.recipe.minCycleMs || duration > this.recipe.maxCycleMs) {
        this.state = 'seeking_target';
        return [];
      }
      this.acceptedReps += 1;
      const events: MotionEvent[] = [
        {
          type: 'rep_accepted',
          atMs: feature.atMs,
          exerciseId: this.recipe.exerciseId,
          setIndex: this.setIndex,
          repIndex: this.acceptedReps,
          payload: { durationMs: duration },
        },
      ];
      if (this.acceptedReps >= this.recipe.repsPerSet) {
        events.push({
          type: 'set_complete',
          atMs: feature.atMs,
          exerciseId: this.recipe.exerciseId,
          setIndex: this.setIndex,
          payload: { acceptedReps: this.acceptedReps },
        });
        if (this.setIndex >= this.recipe.sets) {
          this.state = 'exercise_complete';
          events.push({
            type: 'exercise_complete',
            atMs: feature.atMs,
            exerciseId: this.recipe.exerciseId,
            payload: { sets: this.setIndex },
          });
          return events;
        }
        this.state = 'rest';
        this.acceptedReps = 0;
        events.push({
          type: 'rest_started',
          atMs: feature.atMs,
          exerciseId: this.recipe.exerciseId,
          setIndex: this.setIndex,
          payload: {},
        });
        return events;
      }
      this.state = 'seeking_target';
      return events;
    }
    return [];
  }

  endRest(atMs: number): void {
    if (this.state !== 'rest') return;
    this.setIndex += 1;
    this.cycleStartedAt = atMs;
    this.state = 'seeking_target';
  }
}
