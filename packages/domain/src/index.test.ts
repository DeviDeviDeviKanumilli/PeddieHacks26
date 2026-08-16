// barrel smoke tests. if clamp cannot be imported from index, the public surface is broken.
import { describe, expect, it } from 'vitest';
import { clamp } from './index.js';

describe('domain helpers', () => {
  // clamp is tiny but used in ranking and analysis. keep the bounds inclusive.
  it('clamps values below the lower bound', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('preserves values within the bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5); // mid-range must be a no-op, not rounded.
  });

  it('clamps values above the upper bound', () => {
    expect(clamp(11, 0, 10)).toBe(10); // inclusive max. 10 stays 10 in the test above, 11 becomes 10 here.
  });
});
