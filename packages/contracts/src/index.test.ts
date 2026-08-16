import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import {
  ErrorResponseSchema,
  GenerateWorkoutRequestSchema,
  HealthResponseSchema,
  MovementProfileSchema,
} from './index.js';

// smoke checks for the public typebox schemas. deeper request validation lives in the api package.
describe('API contracts', () => {
  // these are smoke checks. full request validation lives in the api tests.
  it('accepts the health response shape', () => {
    // smallest success envelope. service is literally 'api' so a miswired app fails closed.
    expect(
      Value.Check(HealthResponseSchema, {
        data: { service: 'api', status: 'ok' },
      }),
    ).toBe(true);
  });

  it('rejects malformed error responses', () => {
    // status alone is not an error envelope. clients need type/title/code/detail/requestid.
    expect(Value.Check(ErrorResponseSchema, { status: 500 })).toBe(false);
  });

  it('validates a movement profile and generation request', () => {
    // closed enums + reference ids. no free-text notes in the profile fixture on purpose.
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
    // uuid v4 clientrequestid. reuse this on retry; do not mint a new one.
    expect(
      Value.Check(GenerateWorkoutRequestSchema, {
        clientRequestId: '00000000-0000-4000-8000-000000000001',
        durationMinutes: 10,
      }),
    ).toBe(true);
  });

  it('rejects generation requests outside the documented duration range', () => {
    // 60 is a common "hour" guess. the engine only goes to 45.
    expect(
      Value.Check(GenerateWorkoutRequestSchema, {
        clientRequestId: '00000000-0000-4000-8000-000000000001',
        durationMinutes: 60,
      }),
    ).toBe(false);
  });
});
