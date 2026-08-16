import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from './errors.js';

export interface AccountRepository {
  deleteAccount(userId: string): Promise<void>;
}

// test stand-in. hosted delete is admin-only and retry-safe.
export class MemoryAccountRepository implements AccountRepository {
  private readonly deletedUsers = new Set<string>();

  async deleteAccount(userId: string): Promise<void> {
    this.deletedUsers.add(userId);
  }
}

// supabase is live but we have no service role. do not attempt delete as the request jwt.
export class UnavailableAccountRepository implements AccountRepository {
  async deleteAccount(_userId: string): Promise<void> {
    throw new ApiError({
      statusCode: 503,
      code: 'account_deletion_unavailable',
      title: 'Account deletion unavailable',
      detail: 'Account deletion is not configured on this server.',
    });
  }
}

const deletionError = (detail: string): ApiError =>
  new ApiError({
    statusCode: 503,
    code: 'account_deletion_failed',
    title: 'Account deletion failed',
    detail,
  });

export class SupabaseAccountRepository implements AccountRepository {
  constructor(private readonly serviceClient: SupabaseClient) {}

  async deleteAccount(userId: string): Promise<void> {
    // admin api, not rls. 404 is treated as success so retries after a partial delete stay idempotent.
    const result = await this.serviceClient.auth.admin.deleteUser(userId);
    if (result.error === null) return;
    const status = result.error.status;
    const message = result.error.message.toLowerCase();
    if (status === 404 || message.includes('not found') || message.includes('user not found')) {
      return;
    }
    throw deletionError(
      'The account identity could not be removed. Retry later or contact support.',
    );
  }
}
