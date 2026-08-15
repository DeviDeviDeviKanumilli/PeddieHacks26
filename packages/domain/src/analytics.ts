import { clamp } from './utils.js';

export const MIN_TRACKING_CONFIDENCE = 0.6;
export const MAX_METRICS_PER_BATCH = 100;
export const MAX_METRICS_BATCH_BYTES = 64 * 1024;

export const KNOWN_FEEDBACK_CODES = [
  'low_tracking_confidence',
  'tempo_too_slow',
  'range_of_motion_short',
  'target_position_missed',
  'movement_jerky',
  'stability_left',
  'stability_right',
] as const;

export type FeedbackCode = (typeof KNOWN_FEEDBACK_CODES)[number];

export interface RepMetric {
  readonly setNumber: number;
  readonly repNumber: number;
  readonly counted: boolean;
  readonly durationMs?: number;
  readonly rangeOfMotionDeg?: number;
  readonly targetPositionReached?: boolean;
  readonly accuracyScore?: number;
  readonly controlScore?: number;
  readonly stabilityScore?: number;
  readonly formScore?: number;
  readonly trackingConfidence?: number;
  readonly feedbackCodes: readonly FeedbackCode[];
  readonly recordedOffsetMs?: number;
}

export interface MetricBatch {
  readonly batchId: string;
  readonly metrics: readonly RepMetric[];
}

export class InvalidMetricBatchError extends Error {
  readonly code:
    | 'metric_batch_too_large'
    | 'metric_batch_too_many_reps'
    | 'duplicate_rep_in_batch'
    | 'invalid_metric_value'
    | 'unknown_feedback_code';

  constructor(code: InvalidMetricBatchError['code'], message: string) {
    super(message);
    this.name = 'InvalidMetricBatchError';
    this.code = code;
  }
}

const isFiniteInRange = (value: number | undefined, minimum: number, maximum: number): boolean =>
  value === undefined || (Number.isFinite(value) && value >= minimum && value <= maximum);

export const validateMetricBatch = (batch: MetricBatch): void => {
  if (batch.metrics.length > MAX_METRICS_PER_BATCH) {
    throw new InvalidMetricBatchError(
      'metric_batch_too_many_reps',
      `A metric batch may contain at most ${MAX_METRICS_PER_BATCH} reps.`,
    );
  }
  const serializedBytes = new TextEncoder().encode(JSON.stringify(batch)).byteLength;
  if (serializedBytes > MAX_METRICS_BATCH_BYTES) {
    throw new InvalidMetricBatchError(
      'metric_batch_too_large',
      `A metric batch may not exceed ${MAX_METRICS_BATCH_BYTES} bytes.`,
    );
  }
  const seen = new Set<string>();
  for (const metric of batch.metrics) {
    const key = `${metric.setNumber}:${metric.repNumber}`;
    if (seen.has(key)) {
      throw new InvalidMetricBatchError(
        'duplicate_rep_in_batch',
        'A batch cannot contain the same set and rep twice.',
      );
    }
    seen.add(key);
    if (!Number.isInteger(metric.setNumber) || metric.setNumber < 1 || metric.setNumber > 5) {
      throw new InvalidMetricBatchError(
        'invalid_metric_value',
        'setNumber must be an integer from 1 through 5.',
      );
    }
    if (!Number.isInteger(metric.repNumber) || metric.repNumber < 1 || metric.repNumber > 50) {
      throw new InvalidMetricBatchError(
        'invalid_metric_value',
        'repNumber must be an integer from 1 through 50.',
      );
    }
    if (!isFiniteInRange(metric.durationMs, 0, 3600000)) {
      throw new InvalidMetricBatchError(
        'invalid_metric_value',
        'durationMs is outside the supported range.',
      );
    }
    if (!isFiniteInRange(metric.rangeOfMotionDeg, 0, 360)) {
      throw new InvalidMetricBatchError(
        'invalid_metric_value',
        'rangeOfMotionDeg is outside the supported range.',
      );
    }
    for (const score of [
      metric.accuracyScore,
      metric.controlScore,
      metric.stabilityScore,
      metric.formScore,
    ]) {
      if (!isFiniteInRange(score, 0, 100)) {
        throw new InvalidMetricBatchError(
          'invalid_metric_value',
          'A score is outside the supported range.',
        );
      }
    }
    if (!isFiniteInRange(metric.trackingConfidence, 0, 1)) {
      throw new InvalidMetricBatchError(
        'invalid_metric_value',
        'trackingConfidence is outside the supported range.',
      );
    }
    if (!isFiniteInRange(metric.recordedOffsetMs, 0, 86400000)) {
      throw new InvalidMetricBatchError(
        'invalid_metric_value',
        'recordedOffsetMs is outside the supported range.',
      );
    }
    for (const feedbackCode of metric.feedbackCodes) {
      if (!(KNOWN_FEEDBACK_CODES as readonly string[]).includes(feedbackCode)) {
        throw new InvalidMetricBatchError(
          'unknown_feedback_code',
          'feedbackCodes contains an unknown code.',
        );
      }
    }
  }
};

export interface RomAnalysis {
  readonly averageDeg: number | null;
  readonly minimumDeg: number | null;
  readonly maximumDeg: number | null;
  readonly percentageInTarget: number | null;
}

export interface TempoAnalysis {
  readonly meanSeconds: number | null;
  readonly medianSeconds: number | null;
  readonly standardDeviationSeconds: number | null;
  readonly targetAdherence: number | null;
}

export type PerformanceChangeClassification = 'stable' | 'mild_decline' | 'notable_decline';

export interface PerformanceChange {
  readonly classification: PerformanceChangeClassification;
  readonly delta: number;
}

export interface ExerciseAnalysis {
  readonly completion: {
    readonly countedReps: number;
    readonly targetReps: number;
    readonly percentage: number;
  };
  readonly rangeOfMotion: RomAnalysis;
  readonly movementAccuracy: number | null;
  readonly movementControl: number | null;
  readonly stability: number | null;
  readonly tempo: TempoAnalysis;
  readonly overallScore: number | null;
  readonly performanceChange: PerformanceChange | null;
}

export interface AnalysisInput {
  readonly targetReps: number;
  readonly metrics: readonly RepMetric[];
  readonly romTarget?: { readonly minDeg: number; readonly maxDeg: number };
  readonly tempoTarget?: { readonly minSeconds: number; readonly maxSeconds: number };
}

const average = (values: readonly number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted[middle - 1];
  const upper = sorted[middle];
  return sorted.length % 2 === 0 && lower !== undefined && upper !== undefined
    ? (lower + upper) / 2
    : (upper ?? null);
};

const standardDeviation = (values: readonly number[]): number | null => {
  const mean = average(values);
  if (mean === null) return null;
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)) ?? 0);
};

const trackedMetrics = (metrics: readonly RepMetric[]): RepMetric[] =>
  metrics.filter(
    (metric) =>
      metric.trackingConfidence !== undefined &&
      metric.trackingConfidence >= MIN_TRACKING_CONFIDENCE,
  );

const scoreForMetric = (
  values: readonly number[],
  weight: number,
): { value: number; weight: number } | null => {
  const value = average(values);
  return value === null ? null : { value, weight };
};

export const analyzeExerciseSession = (input: AnalysisInput): ExerciseAnalysis => {
  const validTracked = trackedMetrics(input.metrics);
  const countedReps = input.metrics.filter((metric) => metric.counted).length;
  const completionPercentage =
    input.targetReps === 0 ? 0 : clamp((countedReps / input.targetReps) * 100, 0, 100);
  const romTarget = input.romTarget;
  const tempoTarget = input.tempoTarget;
  const romValues = validTracked.flatMap((metric) =>
    metric.rangeOfMotionDeg === undefined ? [] : [metric.rangeOfMotionDeg],
  );
  const inTarget =
    romTarget === undefined
      ? []
      : romValues.filter((value) => value >= romTarget.minDeg && value <= romTarget.maxDeg);
  const durationSeconds = validTracked.flatMap((metric) =>
    metric.durationMs === undefined ? [] : [metric.durationMs / 1000],
  );
  const targetTempoAdherence =
    tempoTarget === undefined
      ? null
      : durationSeconds.length === 0
        ? null
        : (durationSeconds.filter(
            (value) => value >= tempoTarget.minSeconds && value <= tempoTarget.maxSeconds,
          ).length /
            durationSeconds.length) *
          100;
  const accuracyValues = validTracked.flatMap((metric) =>
    metric.targetPositionReached === undefined ? [] : [metric.targetPositionReached ? 100 : 0],
  );
  const controlValues = validTracked.flatMap((metric) =>
    metric.controlScore === undefined ? [] : [metric.controlScore],
  );
  const stabilityValues = validTracked.flatMap((metric) =>
    metric.stabilityScore === undefined ? [] : [metric.stabilityScore],
  );
  const componentScores = [
    scoreForMetric([completionPercentage], 0.2),
    romTarget === undefined
      ? null
      : scoreForMetric(
          romValues.length === 0 ? [] : [(inTarget.length / romValues.length) * 100],
          0.25,
        ),
    scoreForMetric(accuracyValues, 0.2),
    scoreForMetric(controlValues, 0.15),
    scoreForMetric(stabilityValues, 0.1),
    tempoTarget === undefined
      ? null
      : scoreForMetric(targetTempoAdherence === null ? [] : [targetTempoAdherence], 0.1),
  ].filter((item): item is { value: number; weight: number } => item !== null);
  const weightTotal = componentScores.reduce((sum, item) => sum + item.weight, 0);
  const overallScore =
    weightTotal === 0
      ? null
      : componentScores.reduce((sum, item) => sum + item.value * item.weight, 0) / weightTotal;

  return {
    completion: { countedReps, targetReps: input.targetReps, percentage: completionPercentage },
    rangeOfMotion: {
      averageDeg: average(romValues),
      minimumDeg: romValues.length === 0 ? null : Math.min(...romValues),
      maximumDeg: romValues.length === 0 ? null : Math.max(...romValues),
      percentageInTarget:
        romTarget === undefined || romValues.length === 0
          ? null
          : (inTarget.length / romValues.length) * 100,
    },
    movementAccuracy: average(accuracyValues),
    movementControl: average(controlValues),
    stability: average(stabilityValues),
    tempo: {
      meanSeconds: average(durationSeconds),
      medianSeconds: median(durationSeconds),
      standardDeviationSeconds: standardDeviation(durationSeconds),
      targetAdherence: targetTempoAdherence,
    },
    overallScore,
    performanceChange: performanceChangeFor(validTracked),
  };
};

const performanceValue = (metric: RepMetric): number | null => {
  const values = [
    metric.formScore,
    metric.accuracyScore,
    metric.controlScore,
    metric.stabilityScore,
  ].filter((value): value is number => value !== undefined);
  return average(values);
};

const performanceChangeFor = (metrics: readonly RepMetric[]): PerformanceChange | null => {
  if (metrics.length < 6) return null;
  const values = metrics.flatMap((metric) => {
    const value = performanceValue(metric);
    return value === null ? [] : [value];
  });
  if (values.length < 6) return null;
  const third = Math.floor(values.length / 3);
  const firstAverage = average(values.slice(0, third));
  const finalAverage = average(values.slice(-third));
  if (firstAverage === null || finalAverage === null) return null;
  const delta = finalAverage - firstAverage;
  return {
    delta,
    classification: delta <= -20 ? 'notable_decline' : delta <= -10 ? 'mild_decline' : 'stable',
  };
};

export const compareProgress = (
  currentScore: number | null,
  previousScores: readonly number[],
): {
  readonly baselineScore: number;
  readonly scoreDelta: number;
  readonly relativePercentage: number | null;
} | null => {
  if (currentScore === null || previousScores.length === 0) return null;
  const baselineValues =
    previousScores.length >= 3 ? previousScores.slice(0, 3) : previousScores.slice(0, 1);
  const baselineScore = average(baselineValues);
  if (baselineScore === null) return null;
  const scoreDelta = currentScore - baselineScore;
  return {
    baselineScore,
    scoreDelta,
    relativePercentage: baselineScore === 0 ? null : (scoreDelta / baselineScore) * 100,
  };
};
