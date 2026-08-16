import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Newsreader_600SemiBold,
  Newsreader_600SemiBold_Italic,
} from '@expo-google-fonts/newsreader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hideExpoDevMenuFab } from '@/lib/devMenu';
import { getSupabaseClient } from '@/lib/supabase';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/tokens';

// root shell. fonts, guest vs live, and a stack that refuses swipe-back.
// hold the native splash until fonts are in, otherwise the first frame flashes system type.
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Newsreader_600SemiBold,
    Newsreader_600SemiBold_Italic,
  });
  const reducedMotion = useAppStore((state) =>
    state.profile.accessibility.includes('Reduced motion'),
  );

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    hideExpoDevMenuFab();
  }, []);

  // guest vs live is just "do we have a supabase session". no session = stay local.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      useAppStore.getState().setMode(data.session ? 'live' : 'guest');
      useAppStore.getState().setAccountEmail(data.session?.user.email ?? null);
    };
    void syncSession();
    const auth = supabase.auth.onAuthStateChange((_event, session) => {
      useAppStore.getState().setMode(session ? 'live' : 'guest');
      useAppStore.getState().setAccountEmail(session?.user.email ?? null);
    });
    // pause token refresh in background so we aren't burning radio for a workout app.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      auth.data.subscription.unsubscribe();
      appState.remove();
    };
  }, []);

  // fonts are a hard gate — returning null keeps splash up instead of a broken layout.
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              animation: reducedMotion ? 'none' : 'slide_from_right',
              contentStyle: { backgroundColor: colors.canvas },
              // swipe-back would dump people out of onboarding/session mid-flow.
              gestureEnabled: false,
              headerShown: false,
            }}
          />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
