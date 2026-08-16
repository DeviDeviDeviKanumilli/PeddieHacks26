import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertNoMedia,
  equipmentEligible,
  evaluateCompatibility,
  generateWorkout,
  IsolatedPipeline,
  inspectMotion,
  isAllowedPoseSample,
  MotionEventBus,
  ORCHESTRATOR_PARAMETER_BUDGET,
  orchestrate,
  packEquipment,
  parameterBudget,
  RepetitionTracker,
  resetToolIdempotency,
  toAllowlistedMetric,
  validateToolCall,
} from './index.js';
import type {
  AccessibilityFlags,
  CatalogExercise,
  ExerciseRecipe,
  MovementProfile,
  WorkoutItem,
} from './types.js';

const root = dirname(fileURLToPath(import.meta.url));

const flags = (overrides: Partial<AccessibilityFlags> = {}): AccessibilityFlags => ({
  largerText: false,
  highContrast: false,
  reducedMotion: false,
  spokenFeedback: false,
  hapticFeedback: false,
  oneHanded: false,
  ...overrides,
});

const profile = (overrides: Partial<MovementProfile> = {}): MovementProfile => ({
  goals: ['strength'],
  regions: { biceps: 'focus' },
  standing: 'neutral',
  equipment: ['chair'],
  accessibility: flags(),
  ...overrides,
});

const curl: CatalogExercise = {
  id: 'seated-biceps-curl',
  name: 'Seated biceps curl',
  position: 'seated',
  equipment: ['chair'],
  equipmentOrGroup: false,
  impact: 'none',
  primaryRegion: 'biceps',
  defaultSets: 2,
  defaultReps: 8,
  defaultRestSeconds: 45,
};

const jump: CatalogExercise = {
  ...curl,
  id: 'jump-squat',
  name: 'Jump squat',
  position: 'standing',
  impact: 'jump',
  primaryRegion: 'quadriceps',
};

const recipe: ExerciseRecipe = {
  exerciseId: curl.id,
  targetAngleDeg: 140,
  returnAngleDeg: 50,
  confidenceGate: 0.5,
  minCycleMs: 40,
  maxCycleMs: 4000,
  minRomDeg: 20,
  maxStability: 800,
  minVelocity: 5,
  maxVelocity: 400,
  repsPerSet: 2,
  sets: 1,
};

const prescription: WorkoutItem = {
  exerciseId: curl.id,
  sets: 1,
  reps: 2,
  restSeconds: 45,
};

describe('isolation', () => {
  it('does not depend on product packages or apps', () => {
    const pkg = JSON.parse(readFileSync(join(root, '../package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies ?? {}).toEqual({});
    const sources = readdirSync(root).filter((name) => name.endsWith('.ts'));
    for (const name of sources) {
      const text = readFileSync(join(root, name), 'utf8');
      expect(text).not.toMatch(/@peddie\/(contracts|domain)/u);
      expect(text).not.toMatch(/apps\/(mobile|api|web)/u);
    }
  });

  it('is not imported by product clients or the API', () => {
    const workspace = join(root, '../../..');
    const scan = (dir: string): string[] => {
      const hits: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) hits.push(...scan(path));
        else if (/\.(ts|tsx|js)$/u.test(entry.name) && !path.includes('packages/intelligence')) {
          const text = readFileSync(path, 'utf8');
          if (text.includes('@peddie/intelligence')) hits.push(path);
        }
      }
      return hits;
    };
    expect(scan(join(workspace, 'apps'))).toEqual([]);
    expect(scan(join(workspace, 'packages/contracts'))).toEqual([]);
    expect(scan(join(workspace, 'packages/domain'))).toEqual([]);
  });
});

describe('compatibility and generation', () => {
  it('treats empty equipment as a chair and excludes jumps', () => {
    expect(evaluateCompatibility(curl, profile({ equipment: [] })).status).toBe('compatible');
    expect(evaluateCompatibility(jump, profile()).status).toBe('incompatible');
    expect(packEquipment(['chair', 'band'])).toBeGreaterThan(packEquipment(['chair']));
    expect(equipmentEligible(curl, profile({ equipment: [] }))).toBe(true);
  });

  it('builds a short eligible plan', () => {
    const items = generateWorkout(profile(), [curl, jump]);
    expect(items).toEqual([
      { exerciseId: 'seated-biceps-curl', sets: 2, reps: 8, restSeconds: 45 },
    ]);
  });
});

describe('privacy and metrics', () => {
  it('rejects landmark-shaped payloads', () => {
    expect(() => assertNoMedia({ landmarks: [] })).toThrow(/Forbidden field/u);
    expect(isAllowedPoseSample({ landmarks: [{ x: 1 }] })).toBe(false);
    expect(
      isAllowedPoseSample({ angleDeg: 90, confidence: 0.9, nativeInference: true, atMs: 1 }),
    ).toBe(true);
    expect(toAllowlistedMetric({ landmarks: [], exerciseId: 'x' })).toBeNull();
    expect(
      toAllowlistedMetric({
        exerciseId: curl.id,
        setIndex: 1,
        acceptedReps: 2,
        elapsedMs: 900,
        nativeInference: false,
        rangeOfMotionDeg: 40,
      })?.rangeOfMotionDeg,
    ).toBeUndefined();
  });
});

describe('tracker and temporal model', () => {
  it('accepts a target-then-return cycle', () => {
    const tracker = new RepetitionTracker(recipe);
    tracker.start(0);
    expect(
      tracker.ingest({
        angleDeg: 40,
        velocityDegPerSec: 10,
        rangeOfMotionDeg: 10,
        stability: 1,
        confidence: 0.9,
        atMs: 10,
      }),
    ).toEqual([]);
    expect(
      tracker.ingest({
        angleDeg: 150,
        velocityDegPerSec: 20,
        rangeOfMotionDeg: 110,
        stability: 2,
        confidence: 0.9,
        atMs: 80,
      }),
    ).toEqual([]);
    const accepted = tracker.ingest({
      angleDeg: 40,
      velocityDegPerSec: -20,
      rangeOfMotionDeg: 110,
      stability: 2,
      confidence: 0.9,
      atMs: 200,
    });
    expect(accepted[0]?.type).toBe('rep_accepted');
  });

  it('emits a closed issue code for short range', () => {
    const issues = inspectMotion(recipe, {
      angleDeg: 60,
      velocityDegPerSec: 30,
      rangeOfMotionDeg: 5,
      stability: 1,
      confidence: 0.9,
      atMs: 30,
    });
    expect(issues[0]?.payload.code).toBe('range_of_motion_short');
  });
});

describe('tools and orchestrator', () => {
  it('drops media arguments and unknown tools', () => {
    resetToolIdempotency();
    expect(
      validateToolCall('active', {
        tool: 'feedback.emit',
        callId: 'a',
        arguments: { code: 'tempo_too_slow', channel: 'visual', landmarks: [] },
      }).ok,
    ).toBe(false);
    expect(
      validateToolCall('active', {
        tool: 'not.a.tool' as never,
        callId: 'b',
        arguments: {},
      }).ok,
    ).toBe(false);
  });

  it('maps issue codes to validated visual feedback without speech by default', () => {
    resetToolIdempotency();
    const decisions = orchestrate({
      phase: 'active',
      prescription,
      recipe,
      accessibility: flags(),
      nativeInference: true,
      event: {
        type: 'issue_code',
        atMs: 12,
        exerciseId: curl.id,
        payload: { code: 'range_of_motion_short', priority: 'low' },
      },
    });
    const accepted = decisions.filter((decision) => decision.ok);
    expect(accepted.some((decision) => decision.ok && decision.call.tool === 'feedback.emit')).toBe(
      true,
    );
    expect(accepted.some((decision) => decision.ok && decision.call.tool === 'speech.speak')).toBe(
      false,
    );
    expect(parameterBudget).toBe(ORCHESTRATOR_PARAMETER_BUDGET);
  });
});

describe('isolated pipeline', () => {
  it('counts a rep without leaking coordinates onto the bus', () => {
    resetToolIdempotency();
    const pipeline = new IsolatedPipeline(recipe, prescription, flags({ hapticFeedback: true }));
    const seen: string[] = [];
    pipeline.bus.subscribe('*', (event) => {
      seen.push(event.type);
      expect(event.payload).not.toHaveProperty('landmarks');
    });
    pipeline.start(0);
    pipeline.ingest({ angleDeg: 40, confidence: 0.95, nativeInference: true, atMs: 10 }, 'active');
    pipeline.ingest({ angleDeg: 150, confidence: 0.95, nativeInference: true, atMs: 90 }, 'active');
    const decisions = pipeline.ingest(
      { angleDeg: 40, confidence: 0.95, nativeInference: true, atMs: 210 },
      'active',
    );
    expect(seen).toContain('rep_accepted');
    expect(
      decisions.some((decision) => decision.ok && decision.call.tool === 'haptics.pulse'),
    ).toBe(true);
  });

  it('drops feature samples under backpressure', () => {
    const bus = new MotionEventBus();
    const published = bus.publish(
      { type: 'feature_sample', atMs: 1, exerciseId: curl.id, payload: { angleDeg: 1 } },
      true,
    );
    expect(published).toBe(false);
    expect(bus.droppedFeatureCount).toBe(1);
  });
});
