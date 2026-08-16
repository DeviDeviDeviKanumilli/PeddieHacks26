// public expo env only. never put a service-role key or db url in the client.
const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const mobileConfig = {
  // empty string is intentional: guest mode still runs without a backend.
  apiBaseUrl: trimTrailingSlash(process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? ''),
  supabaseUrl: trimTrailingSlash(process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? ''),
  // publishable/anon key. rls + the api still decide what the user can see.
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
};

// used to hide live-only actions when this build is guest-only.
export const hasApiConfig = mobileConfig.apiBaseUrl.length > 0;
// both url and key are required; a half-configured client would look "live" and fail auth.
export const hasSupabaseConfig =
  mobileConfig.supabaseUrl.length > 0 && mobileConfig.supabasePublishableKey.length > 0;
