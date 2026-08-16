import type { ExerciseDetail } from '@peddie/contracts';
import { exerciseFromApi } from '@/lib/exercises';

// contract -> guest-shaped exercise the ui already understands.

// fixture matches the public contract, not a pose payload.
const detail: ExerciseDetail = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'seated-band-row',
  name: 'Seated band row',
  summary: 'A supported upper-back movement.',
  category: 'strength',
  position: 'seated',
  difficulty: 2,
  defaultPrescription: { sets: 3, reps: 8, restSeconds: 50 },
  trackingSupported: true,
  contentVersion: 1,
  instructions: ['Sit tall.', 'Pull with control.'],
  safetyCues: ['Inspect the band.'],
  adaptations: ['Use a lighter band.'],
  bodyDemands: [{ regionId: 'upper-back', involvement: 'primary', demand: 'moderate' }],
  capabilityDemands: [],
  equipmentOptions: [{ equipmentId: 'resistance-band', mode: 'required' }],
  muscles: [{ muscleGroupId: 'upper-back', role: 'primary', intensity: 3 }],
  sources: [
    {
      title: 'Reviewed source',
      publisher: 'Publisher',
      url: 'https://example.org/source',
      publicationYear: 2025,
    },
  ],
  trackingProfile: { key: 'seated-row', version: 1 },
};

describe('exerciseFromApi', () => {
  it('maps the public contract into native display data', () => {
    // visual key inferred from slug so we don't ship photos.
    expect(exerciseFromApi(detail)).toMatchObject({
      slug: 'seated-band-row',
      sets: 3,
      reps: 8,
      restSeconds: 50,
      muscles: ['Upper Back'],
      muscleActivations: [{ id: 'upper-back', role: 'primary', intensity: 3 }],
      visualKey: 'seated-pull',
      equipment: ['Resistance Band'],
      trackingSupported: true,
    });
  });
});
