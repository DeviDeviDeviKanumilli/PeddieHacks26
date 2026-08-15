import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import {
  ErrorResponseSchema,
  GenerateWorkoutRequestSchema,
  HealthResponseSchema,
  MovementProfileSchema,
} from './index.js';

describe('API contracts', () => {
  it('accepts the health response shape', () => {
    expect(
      Value.Check(HealthResponseSchema, {
        data: { service: 'api', status: 'ok' },
      }),
    ).toBe(true);
  });

  it('rejects malformed error responses', () => {
    expect(Value.Check(ErrorResponseSchema, { status: 500 })).toBe(false);
  });

  it('validates a movement profile and generation request', () => {
    expect(
      Value.Check(MovementProfileSchema, {
        version: 1,
        bodyRegions: { knees: 'limited' },
        capabilities: { seated_posture: 'available' },
        equipmentIds: ['stable-chair'],
        goalIds: ['lower_body'],
        intensityPreference: 'low',
      }),
    ).toBe(true);
    expect(
      Value.Check(GenerateWorkoutRequestSchema, {
        clientRequestId: '00000000-0000-4000-8000-000000000001',
        durationMinutes: 10,
      }),
    ).toBe(true);
  });

  it('rejects generation requests outside the documented duration range', () => {
    expect(
      Value.Check(GenerateWorkoutRequestSchema, {
        clientRequestId: '00000000-0000-4000-8000-000000000001',
        durationMinutes: 60,
      }),
    ).toBe(false);
  });
});
