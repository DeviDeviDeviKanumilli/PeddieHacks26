import { render } from '@testing-library/react-native';
import { AnatomyMap } from '@/components/AnatomyMap';

describe('AnatomyMap', () => {
  it('provides text equivalents for highlighted muscle regions and intensity', async () => {
    const view = await render(
      <AnatomyMap
        activations={[
          { id: 'quadriceps', role: 'primary', intensity: 5 },
          { id: 'glutes', role: 'secondary', intensity: 3 },
        ]}
      />,
    );

    expect(view.getByText('Quadriceps')).toBeTruthy();
    expect(view.getByText('Glutes')).toBeTruthy();
    expect(view.getByText('5/5')).toBeTruthy();
    expect(view.getByLabelText('Front and back muscle map')).toBeTruthy();
  });

  it('can hide the body canvas and keep muscle labels', async () => {
    const view = await render(
      <AnatomyMap
        activations={[{ id: 'biceps', role: 'primary', intensity: 5 }]}
        showCanvas={false}
      />,
    );

    expect(view.getByText('Biceps')).toBeTruthy();
    expect(view.queryByLabelText('Front and back muscle map')).toBeNull();
  });
});
