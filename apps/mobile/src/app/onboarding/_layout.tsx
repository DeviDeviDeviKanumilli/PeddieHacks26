import { Stack } from 'expo-router';

// nested stack for the profile wizard. gestures off so a swipe doesn't dump the draft.
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{ animation: 'slide_from_right', gestureEnabled: false, headerShown: false }}
    />
  );
}
