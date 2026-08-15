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
import { getSupabaseClient } from '@/lib/supabase';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/tokens';

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
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      auth.data.subscription.unsubscribe();
      appState.remove();
    };
  }, []);

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
              headerShown: false,
            }}
          />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
