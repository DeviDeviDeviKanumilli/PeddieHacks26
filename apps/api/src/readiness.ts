import type { SupabaseClient } from '@supabase/supabase-js';

export interface ReadinessCheck {
  check(): Promise<void>;
}

export class MemoryReadinessCheck implements ReadinessCheck {
  async check(): Promise<void> {}
}

export class SupabaseReadinessCheck implements ReadinessCheck {
  constructor(private readonly client: SupabaseClient) {}

  async check(): Promise<void> {
    const result = await this.client.from('body_regions').select('id').limit(1);
    if (result.error) throw result.error;
  }
}
