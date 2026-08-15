import { describe, expect, it } from 'vitest';
import { clamp } from './index.js';

describe('domain helpers', () => {
  it('clamps values below the lower bound', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('preserves values within the bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps values above the upper bound', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
