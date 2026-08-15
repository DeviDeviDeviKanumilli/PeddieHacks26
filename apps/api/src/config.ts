export interface AppConfig {
  readonly port: number;
  readonly host: string;
  readonly corsOrigins: true | string[];
  readonly supabaseUrl?: string;
  readonly supabaseAnonKey?: string;
  readonly supabaseServiceRoleKey?: string;
}

const parsePort = (value: string | undefined): number => {
  const port = Number.parseInt(value ?? '3000', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 through 65535.');
  }
  return port;
};

const parseCorsOrigins = (value: string | undefined): true | string[] => {
  if (value === undefined || value.trim() === '') {
    return true;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin when provided.');
  }
  return origins;
};

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
  options: { readonly requireSupabase?: boolean } = {},
): AppConfig => {
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const supabaseAnonKey = env.SUPABASE_ANON_KEY?.trim();
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const hasSupabaseUrl = supabaseUrl !== undefined && supabaseUrl.length > 0;
  const hasSupabaseAnonKey = supabaseAnonKey !== undefined && supabaseAnonKey.length > 0;

  if (hasSupabaseUrl !== hasSupabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be provided together.');
  }
  if (options.requireSupabase && (!hasSupabaseUrl || !hasSupabaseAnonKey)) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required to start the API.');
  }

  return {
    port: parsePort(env.PORT),
    host: env.HOST?.trim() || '::',
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
    ...(hasSupabaseUrl ? { supabaseUrl } : {}),
    ...(hasSupabaseAnonKey ? { supabaseAnonKey } : {}),
    ...(supabaseServiceRoleKey !== undefined && supabaseServiceRoleKey.length > 0
      ? { supabaseServiceRoleKey }
      : {}),
  };
};
