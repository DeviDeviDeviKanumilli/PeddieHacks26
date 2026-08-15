import { MovementProfileSchema, UpdateMovementProfileRequestSchema } from '@peddie/contracts';
import { type Static, Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { requireUser } from '../auth.js';
import type { MovementProfileRepository } from '../catalog-repository.js';

const MovementProfileResponseSchema = Type.Object({ data: MovementProfileSchema });
type UpdateMovementProfileRequest = Static<typeof UpdateMovementProfileRequestSchema>;

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
      if (request.userId === null) throw new Error('Authenticated request did not have a user ID.');
      return { data: await dependencies.profiles.getMovementProfile(request.userId) };
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
      if (request.userId === null) throw new Error('Authenticated request did not have a user ID.');
      const { expectedVersion, ...profile } = request.body;
      return {
        data: await dependencies.profiles.putMovementProfile(
          request.userId,
          expectedVersion,
          profile,
        ),
      };
    },
  );
};
