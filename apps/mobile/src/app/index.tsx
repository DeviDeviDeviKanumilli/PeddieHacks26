import { Redirect } from 'expo-router';
import { useAppStore } from '@/state/useAppStore';

// entry gate. redirect (not push) so this index never sits on the stack.
export default function Index() {
  const onboardingComplete = useAppStore((state) => state.profile.onboardingComplete);
  // unfinished profiles go through welcome; completed ones land on tabs.
  return <Redirect href={onboardingComplete ? '/(tabs)' : '/onboarding/welcome'} />;
}
