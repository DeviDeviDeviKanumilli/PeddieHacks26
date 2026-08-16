import { exercises } from '@/data/catalog';
import { discoverExercises } from '@/lib/discovery';

// guest overlay. live scoring still lives on the server.

describe('discoverExercises', () => {
  it('removes incompatible knee-loading movement from personalized results', () => {
    // personalized hides sit-to-stand; extension stays as caution.
    const result = discoverExercises({
      catalog: exercises,
      regions: { 'left-knee': 'avoid' },
      personalized: true,
      category: 'All',
      query: '',
    });

    expect(result.some(({ slug }) => slug === 'sit-to-stand')).toBe(false);
    expect(result.find(({ slug }) => slug === 'seated-knee-extension')?.compatibility).toBe(
      'caution',
    );
  });

  it('keeps the incompatible result visible in the complete catalog with a reason', () => {
    // unpersonalized browse should still explain why a move is a poor fit.
    const result = discoverExercises({
      catalog: exercises,
      regions: { 'right-knee': 'avoid' },
      personalized: false,
      category: 'Strength',
      query: 'sit',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      slug: 'sit-to-stand',
      compatibility: 'incompatible',
    });
    expect(result[0]?.compatibilityReason).toContain('both knees');
  });
});
