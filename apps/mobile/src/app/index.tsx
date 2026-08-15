import { Redirect } from 'expo-router';
import { useAppStore } from '@/state/useAppStore';

export default function Index() {
  const onboardingComplete = useAppStore((state) => state.profile.onboardingComplete);
  return <Redirect href={onboardingComplete ? '/(tabs)' : '/onboarding/welcome'} />;
}
