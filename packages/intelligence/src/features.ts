import type { AllowedPoseSample, FeatureSample } from './types.js';

const WINDOW = 12;

export class FeatureEngine {
  private readonly samples: AllowedPoseSample[] = [];

  ingest(sample: AllowedPoseSample): FeatureSample {
    const previous = this.samples.at(-1);
    this.samples.push(sample);
    if (this.samples.length > WINDOW) this.samples.shift();
    const dt = previous ? Math.max(1, sample.atMs - previous.atMs) : 1;
    const velocity = previous ? ((sample.angleDeg - previous.angleDeg) * 1000) / dt : 0;
    const angles = this.samples.map((entry) => entry.angleDeg);
    const min = Math.min(...angles);
    const max = Math.max(...angles);
    const mean = angles.reduce((sum, angle) => sum + angle, 0) / angles.length;
    const stability =
      angles.reduce((sum, angle) => sum + (angle - mean) ** 2, 0) / Math.max(1, angles.length);
    return {
      angleDeg: sample.angleDeg,
      velocityDegPerSec: velocity,
      rangeOfMotionDeg: max - min,
      stability,
      confidence: sample.confidence,
      atMs: sample.atMs,
    };
  }

  reset(): void {
    this.samples.length = 0;
  }
}
