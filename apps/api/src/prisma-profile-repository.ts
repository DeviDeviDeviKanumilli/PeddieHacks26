import type { MovementProfile } from '@peddie/domain';
import type { MovementProfileRepository } from './catalog-repository.js';
import { ApiError } from './errors.js';
import type { PrismaClient } from './generated/prisma/client.js';
import { withUserPrismaContext } from './prisma-client.js';

// owner profile via prisma. set jwt claims in the txn so rls still applies.

const dependencyError = (detail: string): ApiError =>
  new ApiError({
    statusCode: 503,
    code: 'dependency_unavailable',
    title: 'Movement profile unavailable',
    detail,
  });

const mapState = <T extends string>(
  rows: readonly { id: string; state: string }[],
): Record<string, T> => Object.fromEntries(rows.map((row) => [row.id, row.state as T]));

export class PrismaMovementProfileRepository implements MovementProfileRepository {
  constructor(private readonly database: PrismaClient) {}

  async getMovementProfile(userId: string): Promise<MovementProfile> {
    try {
      // accesstoken is unused: postgres gets the user from set_config, not a supabase header.
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const [movementProfile, profile, bodyRegions, capabilities, equipment, goals] =
          await Promise.all([
            database.movement_profiles.findUnique({
              where: { user_id: userId },
              select: { version: true },
            }),
            database.profiles.findUnique({
              where: { user_id: userId },
              select: { intensity_preference: true },
            }),
            database.user_body_regions.findMany({
              where: { user_id: userId },
              select: { body_region_id: true, state: true },
            }),
            database.user_capabilities.findMany({
              where: { user_id: userId },
              select: { capability_id: true, state: true },
            }),
            database.user_equipment.findMany({
              where: { user_id: userId },
              orderBy: { equipment_id: 'asc' },
              select: { equipment_id: true },
            }),
            database.user_goals.findMany({
              where: { user_id: userId },
              orderBy: { priority: 'asc' },
              select: { goal_id: true },
            }),
          ]);
        return {
          version: movementProfile === null ? 1 : Number(movementProfile.version),
          bodyRegions: mapState<'neutral' | 'focus' | 'limited' | 'avoid'>(
            bodyRegions.map((row) => ({ id: row.body_region_id, state: row.state })),
          ),
          capabilities: mapState<'unknown' | 'available' | 'limited' | 'avoid'>(
            capabilities.map((row) => ({ id: row.capability_id, state: row.state })),
          ),
          equipmentIds: equipment.map((row) => row.equipment_id),
          goalIds: goals.map((row) => row.goal_id),
          intensityPreference:
            profile?.intensity_preference === 'low' || profile?.intensity_preference === 'high'
              ? profile.intensity_preference
              : 'standard',
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The profile dependency could not be reached.');
    }
  }

  async putMovementProfile(
    userId: string,
    expectedVersion: number,
    profile: Omit<MovementProfile, 'version'>,
  ): Promise<MovementProfile> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        // bump version first so a concurrent writer loses instead of mixing child rows.
        const updated = await database.movement_profiles.updateMany({
          where: { user_id: userId, version: BigInt(expectedVersion) },
          data: { version: { increment: 1 } },
        });
        if (updated.count !== 1) {
          throw new ApiError({
            statusCode: 409,
            code: 'version_conflict',
            title: 'Version conflict',
            detail: 'The movement profile changed since it was loaded.',
          });
        }
        await database.profiles.update({
          where: { user_id: userId },
          data: { intensity_preference: profile.intensityPreference },
        });
        // replace child rows inside the same txn so a failed write cannot leave a half profile.
        await Promise.all([
          database.user_body_regions.deleteMany({ where: { user_id: userId } }),
          database.user_capabilities.deleteMany({ where: { user_id: userId } }),
          database.user_equipment.deleteMany({ where: { user_id: userId } }),
          database.user_goals.deleteMany({ where: { user_id: userId } }),
        ]);
        if (Object.keys(profile.bodyRegions).length > 0) {
          await database.user_body_regions.createMany({
            data: Object.entries(profile.bodyRegions).map(([body_region_id, state]) => ({
              user_id: userId,
              body_region_id,
              state,
            })),
          });
        }
        if (Object.keys(profile.capabilities).length > 0) {
          await database.user_capabilities.createMany({
            data: Object.entries(profile.capabilities).map(([capability_id, state]) => ({
              user_id: userId,
              capability_id,
              state,
            })),
          });
        }
        if (profile.equipmentIds.length > 0) {
          await database.user_equipment.createMany({
            data: profile.equipmentIds.map((equipment_id) => ({ user_id: userId, equipment_id })),
          });
        }
        if (profile.goalIds.length > 0) {
          await database.user_goals.createMany({
            data: profile.goalIds.map((goal_id, index) => ({
              user_id: userId,
              goal_id,
              priority: index + 1,
            })),
          });
        }
        return { ...profile, version: expectedVersion + 1 };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The movement profile could not be saved.');
    }
  }
}
