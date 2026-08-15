import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ExerciseCard } from '@/components/ExerciseCard';
import { exercises } from '@/data/catalog';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
jest.mock('lucide-react-native', () => ({
  ArrowUpRight: () => null,
  CircleAlert: () => null,
  MapPin: () => null,
}));

describe('ExerciseCard', () => {
  it('announces compatibility in words and opens the native detail route', async () => {
    const exercise = exercises[0];
    if (!exercise) throw new Error('The demo catalog must include an exercise.');
    const view = await render(<ExerciseCard exercise={exercise} />);
    const card = view.getByRole('button', { name: /Seated biceps curl\. Good fit\./u });

    fireEvent.press(card);

    expect(router.push).toHaveBeenCalledWith('/exercise/seated-biceps-curl');
  });
});
