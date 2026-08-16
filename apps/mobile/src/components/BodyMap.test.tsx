import { fireEvent, render } from '@testing-library/react-native';
import { BodyMap } from '@/components/BodyMap';

describe('BodyMap', () => {
  it('provides a labeled non-visual control for every body region', async () => {
    // svg taps are optional; these labels are the a11y contract for cycling states.
    const onChange = jest.fn();
    const view = await render(<BodyMap onChange={onChange} regions={{}} />);

    fireEvent.press(view.getByLabelText('Shoulders: neutral'));

    expect(onChange).toHaveBeenCalledWith('shoulders', 'focus');
    expect(view.getByText('Left knee')).toBeTruthy();
    // first tap from empty regions is always focus, not limited/avoid.
  });
});
