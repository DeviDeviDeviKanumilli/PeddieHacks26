import { describe, expect, it } from 'vitest';
import {
  analyzeExerciseSession,
  compareProgress,
  InvalidMetricBatchError,
  type RepMetric,
  validateMetricBatch,
} from './index.js';

const metric = (index: number, score = 80, confidence = 0.9): RepMetric => ({
  setNumber: 1,
  repNumber: index + 1,
  counted: true,
  durationMs: 3000,
  rangeOfMotionDeg: 80,
  targetPositionReached: true,
  accuracyScore: score,
  controlScore: score,
  stabilityScore: score,
  formScore: score,
  trackingConfidence: confidence,
  feedbackCodes: [],
});

describe('metrics and analytics', () => {
  it('validates batch size, duplicate reps, and known feedback codes', () => {
    expect(() =>
      validateMetricBatch({ batchId: 'batch', metrics: [metric(0), metric(0)] }),
    ).toThrow(InvalidMetricBatchError);
    expect(() =>
      validateMetricBatch({
        batchId: 'batch',
        metrics: Array.from({ length: 101 }, (_, index) => ({
          ...metric(index % 50),
          repNumber: index + 1,
        })),
      }),
    ).toThrow('at most 100');
    expect(() =>
      validateMetricBatch({
        batchId: 'batch',
        metrics: [{ ...metric(0), feedbackCodes: ['not-a-known-code' as never] }],
      }),
    ).toThrow('unknown code');
  });

  it('computes completion, form metrics, tempo, and decline indicator', () => {
    const metrics = [
      metric(0, 90),
      metric(1, 90),
      metric(2, 90),
      metric(3, 70),
      metric(4, 70),
      metric(5, 70),
    ];
    const analysis = analyzeExerciseSession({
      targetReps: 10,
      metrics,
      romTarget: { minDeg: 70, maxDeg: 90 },
      tempoTarget: { minSeconds: 2, maxSeconds: 4 },
    });

    expect(analysis.completion.percentage).toBe(60);
    expect(analysis.rangeOfMotion.percentageInTarget).toBe(100);
    expect(analysis.movementAccuracy).toBe(100);
    expect(analysis.tempo.meanSeconds).toBe(3);
    expect(analysis.performanceChange?.classification).toBe('notable_decline');
  });

  it('excludes low-confidence reps from form analytics but counts completion', () => {
    const analysis = analyzeExerciseSession({
      targetReps: 1,
      metrics: [metric(0, 10, 0.4)],
      romTarget: { minDeg: 70, maxDeg: 90 },
    });

    expect(analysis.completion.percentage).toBe(100);
    expect(analysis.movementAccuracy).toBeNull();
    expect(analysis.overallScore).toBe(100);
  });

  it('uses the previous three scores as the progress baseline', () => {
    expect(compareProgress(90, [60, 70, 80])).toEqual({
      baselineScore: 70,
      scoreDelta: 20,
      relativePercentage: (20 / 70) * 100,
    });
    expect(compareProgress(null, [80])).toBeNull();
  });
});
