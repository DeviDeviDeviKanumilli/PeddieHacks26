import { buildCountedRepMetrics } from '@/lib/sessionSync';

describe('buildCountedRepMetrics', () => {
  it('records counts by set without inventing form measurements or pose data', () => {
    const metrics = buildCountedRepMetrics(5, 3, 15);

    expect(metrics).toHaveLength(5);
    expect(metrics.map(({ setNumber, repNumber }) => [setNumber, repNumber])).toEqual([
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 2],
    ]);
    expect(metrics[0]).toEqual({
      setNumber: 1,
      repNumber: 1,
      counted: true,
      durationMs: 3000,
      feedbackCodes: [],
      recordedOffsetMs: 3000,
    });
    expect(JSON.stringify(metrics)).not.toMatch(/video|image|audio|landmark|coordinate/iu);
  });
});
