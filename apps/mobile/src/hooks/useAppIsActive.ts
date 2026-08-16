import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// pose + camera must stop when the app backgrounds. screens subscribe here instead of
// each rolling their own appstate listener (easy to leak).
export const useAppIsActive = (): boolean => {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // inactive/background both mean "not in the foreground" for our camera policy.
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  return active; // true only in the foreground.
};
