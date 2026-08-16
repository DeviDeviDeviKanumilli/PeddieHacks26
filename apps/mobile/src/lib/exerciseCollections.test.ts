import { exercises } from '@/data/catalog';
import { exercisesInCollection, getExerciseCollection } from '@/lib/exerciseCollections';

// views over the catalog, not a second list to keep in sync.

describe('exercise collections', () => {
  it('groups exercises by movement purpose without duplicating catalog data', () => {
    // collections are filters, not a second catalog copy.
    const upperBody = getExerciseCollection('upper-body');
    if (!upperBody) throw new Error('Upper-body collection must exist.');

    expect(exercisesInCollection(exercises, upperBody).map(({ slug }) => slug)).toContain(
      'seated-biceps-curl',
    );
  });

  it('keeps the seated collection driven by exercise attributes', () => {
    // position is the source of truth, not equipment labels.
    const seated = getExerciseCollection('seated-movement');
    if (!seated) throw new Error('Seated collection must exist.');

    expect(
      exercisesInCollection(exercises, seated).every(({ position }) => position === 'seated'),
    ).toBe(true);
  });
});
