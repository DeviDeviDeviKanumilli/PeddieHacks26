const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const mobileConfig = {
  apiBaseUrl: trimTrailingSlash(process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? ''),
  supabaseUrl: trimTrailingSlash(process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? ''),
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
};

export const hasApiConfig = mobileConfig.apiBaseUrl.length > 0;
export const hasSupabaseConfig =
  mobileConfig.supabaseUrl.length > 0 && mobileConfig.supabasePublishableKey.length > 0;
