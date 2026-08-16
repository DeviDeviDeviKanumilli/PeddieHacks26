import { MovementProfileSchema, UpdateMovementProfileRequestSchema } from '@peddie/contracts';
import { type Static, Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { requestAuth, requireUser } from '../auth.js';
import type { MovementProfileRepository } from '../catalog-repository.js';

const MovementProfileResponseSchema = Type.Object({ data: MovementProfileSchema });
type UpdateMovementProfileRequest = Static<typeof UpdateMovementProfileRequestSchema>;

// owner-only movement profile. optimistic version lives on the body, not if-match.
export const registerProfileRoutes = async (
  app: FastifyInstance,
  dependencies: { readonly profiles: MovementProfileRepository },
): Promise<void> => {
  app.get(
    '/v1/movement-profile',
    {
      preHandler: requireUser,
      schema: { response: { 200: MovementProfileResponseSchema } },
    },
    async (request) => {
      const auth = requestAuth(request);
      return {
        data: await dependencies.profiles.getMovementProfile(auth.userId, auth.accessToken),
      };
    },
  );

  app.put<{ Body: UpdateMovementProfileRequest }>(
    '/v1/movement-profile',
    {
      preHandler: requireUser,
      schema: {
        body: UpdateMovementProfileRequestSchema,
        response: { 200: MovementProfileResponseSchema },
      },
    },
    async (request) => {
      const auth = requestAuth(request);
      // repo replaces nested rows atomically; we just peel expectedversion off the contract.
      const { expectedVersion, ...profile } = request.body;
      return {
        data: await dependencies.profiles.putMovementProfile(
          auth.userId,
          expectedVersion,
          profile,
          auth.accessToken,
        ),
      };
    },
  );
};
