import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.hoisted(() => vi.fn(() => ({ auth: {} })));

vi.mock('@supabase/supabase-js', () => ({ createClient }));

describe('browser environment configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    createClient.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    ['blank URL', '   ', ' public-key '],
    ['blank key', ' https://example.supabase.co/ ', '   '],
  ])('disables live mode with a %s', async (_case, url, key) => {
    vi.stubEnv('VITE_SUPABASE_URL', url);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', key);

    const { hasLiveConfiguration, supabase } = await import('./supabase');

    expect(supabase).toBeNull();
    expect(hasLiveConfiguration).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('trims complete Supabase configuration before creating the client', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '  https://example.supabase.co/  ');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '  public-key  ');

    const { hasLiveConfiguration } = await import('./supabase');

    expect(hasLiveConfiguration).toBe(true);
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co/',
      'public-key',
      expect.objectContaining({ auth: expect.any(Object) }),
    );
  });

  it('falls back to the same-origin API proxy when VITE_API_URL is blank', async () => {
    vi.stubEnv('VITE_API_URL', '   ');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { status: 'ok' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { ApiClient } = await import('./api');

    await new ApiClient(async () => null).get('/healthz');

    expect(fetchMock).toHaveBeenCalledWith('/api/healthz', expect.any(Object));
  });

  it('trims a configured API base URL', async () => {
    vi.stubEnv('VITE_API_URL', '  https://api.example.test/  ');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { status: 'ok' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { ApiClient } = await import('./api');

    await new ApiClient(async () => null).get('/healthz');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/healthz', expect.any(Object));
  });
});
