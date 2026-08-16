import {
  activationsFromLoad,
  combineMuscleLoad,
  inferMuscleActivations,
  inferVisualKey,
  muscleIdsForLabel,
} from '@/lib/anatomy';

describe('anatomy data adapters', () => {
  it('turns exercise muscle labels into stable reusable regions', () => {
    expect(inferMuscleActivations(['Quadriceps', 'Glutes'])).toEqual([
      { id: 'quadriceps', role: 'primary', intensity: 4 },
      { id: 'glutes', role: 'secondary', intensity: 3 },
    ]);
  });

  it('resolves extra muscle partitions and common synonyms', () => {
    expect(muscleIdsForLabel('Obliques')).toEqual(['obliques']);
    expect(muscleIdsForLabel('Traps')).toEqual(['traps']);
    expect(muscleIdsForLabel('Latissimus dorsi')).toEqual(['lats']);
    expect(muscleIdsForLabel('Pecs')).toEqual(['chest']);
    expect(muscleIdsForLabel('Abs')).toEqual(['core']);
  });

  it('combines a workout into relative muscle coverage', () => {
    const load = combineMuscleLoad([
      [{ id: 'quadriceps', role: 'primary', intensity: 4 }],
      [
        { id: 'quadriceps', role: 'secondary', intensity: 3 },
        { id: 'glutes', role: 'primary', intensity: 4 },
      ],
    ]);

    expect(load).toEqual({ quadriceps: 7, glutes: 4 });
    expect(activationsFromLoad(load)).toEqual([
      { id: 'quadriceps', role: 'primary', intensity: 5 },
      { id: 'glutes', role: 'secondary', intensity: 3 },
    ]);
  });

  it('reuses movement-family art for future exercises', () => {
    expect(
      inferVisualKey({ slug: 'new-seated-row', position: 'seated', category: 'strength' }),
    ).toBe('seated-pull');
    expect(
      inferVisualKey({ slug: 'new-supported-raise', position: 'standing', category: 'strength' }),
    ).toBe('wall-supported');
    expect(
      inferVisualKey({
        slug: 'new-seated-leg-extension',
        position: 'seated',
        category: 'strength',
      }),
    ).toBe('seated-mobility');
  });
});
