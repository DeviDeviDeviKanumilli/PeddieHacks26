import { buildApp } from './app.js';
import { loadConfig } from './config.js';

// production process: refuse to listen without both postgres and supabase.
const config = loadConfig(process.env, { requireDatabase: true, requireSupabase: true });
const app = await buildApp({ config });

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  // bind failures should crash the process so railway restarts us.
  app.log.error(error);
  process.exit(1);
}
