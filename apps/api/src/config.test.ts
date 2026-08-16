import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('API configuration', () => {
  it('loads safe documented defaults', () => {
    // tests and local boot omit supabase; production server.ts requires it.
    expect(loadConfig({})).toMatchObject({
      port: 3000,
      host: '::',
      logLevel: 'info',
      trustProxy: false,
      corsOrigins: true,
      rateLimits: {
        catalog: 60,
        general: 120,
        generation: 10,
        metrics: 30,
        deletion: 3,
      },
    });
  });

  it('loads deployment, logging, proxy, CORS, and rate-limit settings', () => {
    // railway sets trust_proxy so rate limits use the real client, not the edge ip.
    expect(
      loadConfig({
        PORT: '8080',
        HOST: '0.0.0.0',
        LOG_LEVEL: 'warn',
        TRUST_PROXY: 'true',
        CORS_ORIGINS: 'https://app.example,https://admin.example',
        RAILWAY_DEPLOYMENT_ID: 'deployment-123',
        RATE_LIMIT_CATALOG: '61',
        RATE_LIMIT_GENERAL: '121',
        RATE_LIMIT_GENERATION: '11',
        RATE_LIMIT_METRICS: '31',
        RATE_LIMIT_DELETION: '4',
      }),
    ).toMatchObject({
      port: 8080,
      host: '0.0.0.0',
      logLevel: 'warn',
      trustProxy: true,
      corsOrigins: ['https://app.example', 'https://admin.example'],
      deploymentId: 'deployment-123',
      rateLimits: {
        catalog: 61,
        general: 121,
        generation: 11,
        metrics: 31,
        deletion: 4,
      },
    });
  });

  it('rejects invalid operational settings', () => {
    // fail at boot rather than silently clamping a typo.
    expect(() => loadConfig({ LOG_LEVEL: 'verbose' })).toThrow('LOG_LEVEL');
    expect(() => loadConfig({ TRUST_PROXY: 'yes' })).toThrow('TRUST_PROXY');
    expect(() => loadConfig({ RATE_LIMIT_METRICS: '0' })).toThrow('RATE_LIMIT_METRICS');
  });
});
