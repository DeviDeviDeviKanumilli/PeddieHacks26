import { MotionEventBus } from './bus.js';
import { FeatureEngine } from './features.js';
import { orchestrate } from './orchestrator.js';
import { isAllowedPoseSample } from './privacy.js';
import { inspectMotion } from './temporal.js';
import { RepetitionTracker } from './tracker.js';
import type {
  AccessibilityFlags,
  AllowedPoseSample,
  ExerciseRecipe,
  SessionPhase,
  ToolDecision,
  WorkoutItem,
} from './types.js';

export class IsolatedPipeline {
  readonly bus = new MotionEventBus();
  private readonly features = new FeatureEngine();
  private readonly tracker: RepetitionTracker;
  private lastAt = 0;

  constructor(
    private readonly recipe: ExerciseRecipe,
    private readonly prescription: WorkoutItem,
    private readonly accessibility: AccessibilityFlags,
  ) {
    this.tracker = new RepetitionTracker(recipe);
  }

  start(atMs: number): void {
    this.tracker.start(atMs);
  }

  ingest(sample: AllowedPoseSample, phase: SessionPhase): ToolDecision[] {
    if (!isAllowedPoseSample(sample)) return [];
    const feature = this.features.ingest(sample);
    const backpressure = sample.atMs - this.lastAt < 8 && this.lastAt !== 0;
    this.lastAt = sample.atMs;
    this.bus.publish(
      {
        type: 'feature_sample',
        atMs: sample.atMs,
        exerciseId: this.recipe.exerciseId,
        payload: { ...feature },
      },
      backpressure,
    );
    const lifecycle = this.tracker.ingest(feature);
    const issues = inspectMotion(this.recipe, feature);
    const decisions: ToolDecision[] = [];
    for (const event of [...lifecycle, ...issues]) {
      this.bus.publish(event);
      decisions.push(
        ...orchestrate({
          phase,
          prescription: this.prescription,
          recipe: this.recipe,
          event,
          accessibility: this.accessibility,
          nativeInference: sample.nativeInference,
        }),
      );
    }
    return decisions;
  }
}
