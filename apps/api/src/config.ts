export interface AppConfig {
  readonly port: number;
  readonly host: string;
  readonly logLevel: LogLevel;
  readonly trustProxy: boolean;
  readonly corsOrigins: true | string[];
  readonly rateLimits: RateLimitConfig;
  readonly deploymentId?: string;
  readonly databaseUrl?: string;
  readonly supabaseUrl?: string;
  readonly supabaseAnonKey?: string;
  readonly supabaseServiceRoleKey?: string;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

export interface RateLimitConfig {
  readonly catalog: number;
  readonly general: number;
  readonly generation: number;
  readonly metrics: number;
  readonly deletion: number;
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

const parsePositiveInteger = (
  name: string,
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
};

const parseBoolean = (name: string, value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false.`);
};

const LOG_LEVELS = new Set<LogLevel>([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
]);

const parseLogLevel = (value: string | undefined): LogLevel => {
  const level = value?.trim() || 'info';
  if (!LOG_LEVELS.has(level as LogLevel)) {
    throw new Error('LOG_LEVEL must be trace, debug, info, warn, error, fatal, or silent.');
  }
  return level as LogLevel;
};

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
  options: { readonly requireDatabase?: boolean; readonly requireSupabase?: boolean } = {},
): AppConfig => {
  const databaseUrl = env.DATABASE_URL?.trim();
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const supabaseAnonKey = env.SUPABASE_ANON_KEY?.trim();
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const deploymentId = (env.RAILWAY_DEPLOYMENT_ID ?? env.DEPLOYMENT_ID)?.trim();
  const hasSupabaseUrl = supabaseUrl !== undefined && supabaseUrl.length > 0;
  const hasSupabaseAnonKey = supabaseAnonKey !== undefined && supabaseAnonKey.length > 0;

  if (hasSupabaseUrl !== hasSupabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be provided together.');
  }
  if (options.requireSupabase && (!hasSupabaseUrl || !hasSupabaseAnonKey)) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required to start the API.');
  }
  if (options.requireDatabase && (!databaseUrl || databaseUrl.length === 0)) {
    throw new Error('DATABASE_URL is required to start the API.');
  }

  return {
    port: parsePort(env.PORT),
    host: env.HOST?.trim() || '::',
    logLevel: parseLogLevel(env.LOG_LEVEL),
    trustProxy: parseBoolean('TRUST_PROXY', env.TRUST_PROXY, false),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
    rateLimits: {
      catalog: parsePositiveInteger('RATE_LIMIT_CATALOG', env.RATE_LIMIT_CATALOG, 60),
      general: parsePositiveInteger('RATE_LIMIT_GENERAL', env.RATE_LIMIT_GENERAL, 120),
      generation: parsePositiveInteger('RATE_LIMIT_GENERATION', env.RATE_LIMIT_GENERATION, 10),
      metrics: parsePositiveInteger('RATE_LIMIT_METRICS', env.RATE_LIMIT_METRICS, 30),
      deletion: parsePositiveInteger('RATE_LIMIT_DELETION', env.RATE_LIMIT_DELETION, 3),
    },
    ...(deploymentId !== undefined && deploymentId.length > 0 ? { deploymentId } : {}),
    ...(databaseUrl !== undefined && databaseUrl.length > 0 ? { databaseUrl } : {}),
    ...(hasSupabaseUrl ? { supabaseUrl } : {}),
    ...(hasSupabaseAnonKey ? { supabaseAnonKey } : {}),
    ...(supabaseServiceRoleKey !== undefined && supabaseServiceRoleKey.length > 0
      ? { supabaseServiceRoleKey }
      : {}),
  };
};
