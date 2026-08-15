import type { MovementProfile } from '@peddie/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MovementProfileRepository } from './catalog-repository.js';
import { ApiError } from './errors.js';
import type { SupabaseClientFactory } from './supabase-client.js';

type Row = Record<string, unknown>;
const rowRecord = (value: unknown): Row =>
  typeof value === 'object' && value !== null ? (value as Row) : {};

const rowsFor = (value: unknown): readonly Row[] =>
  Array.isArray(value) ? value.map(rowRecord) : [];

const stateMap = <T extends string>(
  rows: readonly Row[],
  key: string,
  valueKey: string,
): Record<string, T> =>
  Object.fromEntries(
    rows.flatMap((row) => {
      const id = row[key];
      const value = row[valueKey];
      return typeof id === 'string' && typeof value === 'string' ? [[id, value as T]] : [];
    }),
  );

const dependencyError = (detail: string): ApiError =>
  new ApiError({
    statusCode: 503,
    code: 'dependency_unavailable',
    title: 'Movement profile unavailable',
    detail,
  });

export class SupabaseMovementProfileRepository implements MovementProfileRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly clientFactory?: SupabaseClientFactory,
  ) {}

  async getMovementProfile(userId: string, accessToken?: string): Promise<MovementProfile> {
    const client = this.clientFactory?.(accessToken) ?? this.client;
    const [movementProfile, profile, bodyRegions, capabilities, equipment, goals] =
      await Promise.all([
        client.from('movement_profiles').select('version').eq('user_id', userId).maybeSingle(),
        client.from('profiles').select('intensity_preference').eq('user_id', userId).maybeSingle(),
        client.from('user_body_regions').select('body_region_id,state').eq('user_id', userId),
        client.from('user_capabilities').select('capability_id,state').eq('user_id', userId),
        client.from('user_equipment').select('equipment_id').eq('user_id', userId),
        client.from('user_goals').select('goal_id').eq('user_id', userId).order('priority'),
      ]);
    const failed = [movementProfile, profile, bodyRegions, capabilities, equipment, goals].find(
      (result) => result.error,
    );
    if (failed?.error) {
      throw dependencyError('The profile dependency could not be reached.');
    }
    const version = rowRecord(movementProfile.data).version;
    const intensity = rowRecord(profile.data).intensity_preference;
    return {
      version: typeof version === 'number' ? version : 1,
      bodyRegions: stateMap<'neutral' | 'focus' | 'limited' | 'avoid'>(
        rowsFor(bodyRegions.data),
        'body_region_id',
        'state',
      ),
      capabilities: stateMap<'unknown' | 'available' | 'limited' | 'avoid'>(
        rowsFor(capabilities.data),
        'capability_id',
        'state',
      ),
      equipmentIds: rowsFor(equipment.data).flatMap((row) =>
        typeof row.equipment_id === 'string' ? [row.equipment_id] : [],
      ),
      goalIds: rowsFor(goals.data).flatMap((row) =>
        typeof row.goal_id === 'string' ? [row.goal_id] : [],
      ),
      intensityPreference:
        intensity === 'low' || intensity === 'high' || intensity === 'standard'
          ? intensity
          : 'standard',
    };
  }

  async putMovementProfile(
    userId: string,
    expectedVersion: number,
    profile: Omit<MovementProfile, 'version'>,
    accessToken?: string,
  ): Promise<MovementProfile> {
    const client = this.clientFactory?.(accessToken) ?? this.client;
    const result = await client.rpc('replace_movement_profile', {
      p_user_id: userId,
      p_expected_version: expectedVersion,
      p_body_regions: profile.bodyRegions,
      p_capabilities: profile.capabilities,
      p_equipment_ids: profile.equipmentIds,
      p_goal_ids: profile.goalIds,
      p_intensity_preference: profile.intensityPreference,
    });
    if (result.error) {
      const message = result.error.message.toLowerCase();
      if (message.includes('version conflict')) {
        throw new ApiError({
          statusCode: 409,
          code: 'version_conflict',
          title: 'Version conflict',
          detail: 'The movement profile changed since it was loaded.',
        });
      }
      if (message.includes('not owner')) {
        throw new ApiError({
          statusCode: 403,
          code: 'forbidden',
          title: 'Forbidden',
          detail: 'The movement profile does not belong to the signed-in user.',
        });
      }
      throw dependencyError('The movement profile could not be saved.');
    }
    const data = rowRecord(result.data);
    return {
      ...profile,
      version: typeof data.version === 'number' ? data.version : expectedVersion + 1,
    };
  }
}
