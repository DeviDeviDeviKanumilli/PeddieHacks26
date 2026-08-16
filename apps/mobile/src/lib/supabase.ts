// rn needs the url polyfill before the supabase js client boots.
import 'react-native-url-polyfill/auto';
// session persist uses web localstorage apis; sqlite backs them on device.
import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hasSupabaseConfig, mobileConfig } from '@/lib/config';

// undefined = not created yet, null = guest-only (no public config).
let client: SupabaseClient | null | undefined;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (client !== undefined) return client; // reuse the singleton, including the guest null.
  if (!hasSupabaseConfig) {
    client = null;
    return client;
  }

  // publishable key only. never a service-role secret in this package.
  client = createClient(mobileConfig.supabaseUrl, mobileConfig.supabasePublishableKey, {
    auth: {
      storage: globalThis.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      // no browser oauth hash on native; leave this off or sign-in loops.
      detectSessionInUrl: false,
    },
  });
  return client;
};
