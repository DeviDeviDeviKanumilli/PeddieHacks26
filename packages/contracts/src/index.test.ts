import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import { ErrorResponseSchema, HealthResponseSchema } from './index.js';

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
});
