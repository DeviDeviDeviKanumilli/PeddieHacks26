import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseClientFactory = (accessToken?: string) => SupabaseClient;

// anon key + optional user jwt. hosted rls uses auth.uid() from that bearer, not our userid arg.
export const createSupabaseClientFactory = (
  url: string,
  anonKey: string,
): SupabaseClientFactory => {
  const baseClient = createClient(url, anonKey);
  return (accessToken) => {
    if (accessToken === undefined) return baseClient;
    return createClient(url, anonKey, {
      auth: {
        // this process is not a browser. refreshing here would invent sessions we do not own.
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
