import { exercises } from '@/data/catalog';
import { exercisesInCollection, getExerciseCollection } from '@/lib/exerciseCollections';

describe('exercise collections', () => {
  it('groups exercises by movement purpose without duplicating catalog data', () => {
    const upperBody = getExerciseCollection('upper-body');
    if (!upperBody) throw new Error('Upper-body collection must exist.');

    expect(exercisesInCollection(exercises, upperBody).map(({ slug }) => slug)).toContain(
      'seated-biceps-curl',
    );
  });

  it('keeps the seated collection driven by exercise attributes', () => {
    const seated = getExerciseCollection('seated-movement');
    if (!seated) throw new Error('Seated collection must exist.');

    expect(
      exercisesInCollection(exercises, seated).every(({ position }) => position === 'seated'),
    ).toBe(true);
  });
});
