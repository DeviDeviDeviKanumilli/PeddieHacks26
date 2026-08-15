import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hasSupabaseConfig, mobileConfig } from '@/lib/config';

let client: SupabaseClient | null | undefined;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (client !== undefined) return client;
  if (!hasSupabaseConfig) {
    client = null;
    return client;
  }

  client = createClient(mobileConfig.supabaseUrl, mobileConfig.supabasePublishableKey, {
    auth: {
      storage: globalThis.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
};
