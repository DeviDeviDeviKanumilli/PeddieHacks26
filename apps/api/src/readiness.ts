// cheap dependency probes for /readyz. do not fan out across every table.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PrismaClient } from './generated/prisma/client.js';
import { withAnonymousPrismaContext } from './prisma-client.js';

export interface ReadinessCheck {
  check(): Promise<void>;
}

export class MemoryReadinessCheck implements ReadinessCheck {
  async check(): Promise<void> {}
}

export class SupabaseReadinessCheck implements ReadinessCheck {
  constructor(private readonly client: SupabaseClient) {}

  async check(): Promise<void> {
    // public catalog row is enough; a timeout here should 503, not hang the probe.
    const result = await this.client.from('body_regions').select('id').limit(1);
    if (result.error) throw result.error;
  }
}

export class PrismaReadinessCheck implements ReadinessCheck {
  constructor(private readonly database: PrismaClient) {}

  async check(): Promise<void> {
    // anon role so we do not skip rls just to see if postgres is up.
    await withAnonymousPrismaContext(this.database, async (database) => {
      await database.body_regions.findFirst({ select: { id: true } });
    });
  }
}
