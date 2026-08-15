import {
  SettingsPatchSchema,
  SettingsResponseSchema,
  UserProfilePatchSchema,
  UserProfileResponseSchema,
} from '@peddie/contracts';
import type { FastifyInstance } from 'fastify';
import type { AccountRepository } from '../account-repository.js';
import { requestAuth, requireUser } from '../auth.js';
import type { RateLimitConfig } from '../config.js';
import type { UserRepository } from '../user-repository.js';

export const registerUserRoutes = async (
  app: FastifyInstance,
  dependencies: {
    readonly users: UserRepository;
    readonly accounts: AccountRepository;
    readonly rateLimits: RateLimitConfig;
  },
): Promise<void> => {
  app.get(
    '/v1/users/me',
    {
      preHandler: requireUser,
      schema: { response: { 200: UserProfileResponseSchema } },
    },
    async (request) => {
      const auth = requestAuth(request);
      return { data: await dependencies.users.getProfile(auth.userId, auth.accessToken) };
    },
  );

  app.patch(
    '/v1/users/me',
    {
      preHandler: requireUser,
      schema: {
        body: UserProfilePatchSchema,
        response: { 200: UserProfileResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      const body = request.body as import('@peddie/contracts').UserProfilePatch;
      return {
        data: await dependencies.users.patchProfile(auth.userId, body, auth.accessToken),
      };
    },
  );

  app.delete(
    '/v1/users/me',
    {
      config: {
        rateLimit: {
          max: dependencies.rateLimits.deletion,
          timeWindow: '1 hour',
          groupId: 'account-deletion',
        },
      },
      preHandler: requireUser,
    },
    async (request, reply) => {
      await dependencies.accounts.deleteAccount(requestAuth(request).userId);
      return reply.status(204).send();
    },
  );

  app.get(
    '/v1/settings',
    {
      preHandler: requireUser,
      schema: { response: { 200: SettingsResponseSchema } },
    },
    async (request) => {
      const auth = requestAuth(request);
      return { data: await dependencies.users.getSettings(auth.userId, auth.accessToken) };
    },
  );

  app.patch(
    '/v1/settings',
    {
      preHandler: requireUser,
      schema: {
        body: SettingsPatchSchema,
        response: { 200: SettingsResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      const body = request.body as import('@peddie/contracts').SettingsPatch;
      return {
        data: await dependencies.users.patchSettings(auth.userId, body, auth.accessToken),
      };
    },
  );
};
