import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import { ApiError } from './errors.js';

export interface AuthVerifier {
  verify(accessToken: string): Promise<string | null>;
}

export class SupabaseAuthVerifier implements AuthVerifier {
  constructor(private readonly client: SupabaseClient) {}

  async verify(accessToken: string): Promise<string | null> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || data.user === null) {
      return null;
    }
    return data.user.id;
  }
}

export class RejectingAuthVerifier implements AuthVerifier {
  async verify(_accessToken: string): Promise<string | null> {
    return null;
  }
}

export const authenticateRequest = async (
  request: FastifyRequest,
  verifier: AuthVerifier,
): Promise<void> => {
  request.userId = null;
  const authorization = request.headers.authorization;
  if (authorization === undefined) {
    return;
  }

  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (match === null) {
    throw new ApiError({
      statusCode: 401,
      code: 'invalid_token',
      title: 'Invalid authentication',
      detail: 'The authorization header must contain a bearer token.',
    });
  }

  const accessToken = match[1];
  if (accessToken === undefined) {
    throw new ApiError({
      statusCode: 401,
      code: 'invalid_token',
      title: 'Invalid authentication',
      detail: 'The authorization header must contain a bearer token.',
    });
  }
  const userId = await verifier.verify(accessToken);
  if (userId === null) {
    throw new ApiError({
      statusCode: 401,
      code: 'invalid_token',
      title: 'Invalid authentication',
      detail: 'The access token is missing, expired, or invalid.',
    });
  }
  request.userId = userId;
};

export const requireUser = async (request: FastifyRequest): Promise<void> => {
  if (request.userId === null) {
    throw new ApiError({
      statusCode: 401,
      code: 'authentication_required',
      title: 'Authentication required',
      detail: 'Sign in before accessing this resource.',
    });
  }
};

declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null;
  }
}
