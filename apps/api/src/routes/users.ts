import {
  SettingsPatchSchema,
  SettingsResponseSchema,
  UserProfilePatchSchema,
  UserProfileResponseSchema,
} from '@peddie/contracts';
import type { FastifyInstance } from 'fastify';
import type { AccountRepository } from '../account-repository.js';
import { requireUser } from '../auth.js';
import { ApiError } from '../errors.js';
import type { UserRepository } from '../user-repository.js';

const userIdForRequest = (userId: string | null): string => {
  if (userId === null) {
    throw new ApiError({
      statusCode: 401,
      code: 'authentication_required',
      title: 'Authentication required',
      detail: 'Sign in before accessing this resource.',
    });
  }
  return userId;
};

export const registerUserRoutes = async (
  app: FastifyInstance,
  dependencies: {
    readonly users: UserRepository;
    readonly accounts: AccountRepository;
  },
): Promise<void> => {
  app.get(
    '/v1/users/me',
    {
      preHandler: requireUser,
      schema: { response: { 200: UserProfileResponseSchema } },
    },
    async (request) => ({
      data: await dependencies.users.getProfile(userIdForRequest(request.userId)),
    }),
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
      const body = request.body as import('@peddie/contracts').UserProfilePatch;
      return {
        data: await dependencies.users.patchProfile(userIdForRequest(request.userId), body),
      };
    },
  );

  app.delete(
    '/v1/users/me',
    {
      preHandler: requireUser,
    },
    async (request, reply) => {
      await dependencies.accounts.deleteAccount(userIdForRequest(request.userId));
      return reply.status(204).send();
    },
  );

  app.get(
    '/v1/settings',
    {
      preHandler: requireUser,
      schema: { response: { 200: SettingsResponseSchema } },
    },
    async (request) => ({
      data: await dependencies.users.getSettings(userIdForRequest(request.userId)),
    }),
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
      const body = request.body as import('@peddie/contracts').SettingsPatch;
      return {
        data: await dependencies.users.patchSettings(userIdForRequest(request.userId), body),
      };
    },
  );
};
