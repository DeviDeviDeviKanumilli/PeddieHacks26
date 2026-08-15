import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseClientFactory = (accessToken?: string) => SupabaseClient;

export const createSupabaseClientFactory = (
  url: string,
  anonKey: string,
): SupabaseClientFactory => {
  const baseClient = createClient(url, anonKey);
  return (accessToken) => {
    if (accessToken === undefined) return baseClient;
    return createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });
  };
};
