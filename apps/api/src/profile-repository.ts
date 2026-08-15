import type { MovementProfile } from '@peddie/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MovementProfileRepository } from './catalog-repository.js';
import { ApiError } from './errors.js';

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
  constructor(private readonly client: SupabaseClient) {}

  async getMovementProfile(userId: string): Promise<MovementProfile> {
    const [movementProfile, profile, bodyRegions, capabilities, equipment, goals] =
      await Promise.all([
        this.client.from('movement_profiles').select('version').eq('user_id', userId).maybeSingle(),
        this.client
          .from('profiles')
          .select('intensity_preference')
          .eq('user_id', userId)
          .maybeSingle(),
        this.client.from('user_body_regions').select('body_region_id,state').eq('user_id', userId),
        this.client.from('user_capabilities').select('capability_id,state').eq('user_id', userId),
        this.client.from('user_equipment').select('equipment_id').eq('user_id', userId),
        this.client.from('user_goals').select('goal_id').eq('user_id', userId).order('priority'),
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
  ): Promise<MovementProfile> {
    const { data: nextVersion, error: versionError } = await this.client.rpc(
      'bump_movement_profile_version',
      { p_user_id: userId, p_expected_version: expectedVersion },
    );
    if (versionError) {
      if (versionError.message.toLowerCase().includes('version conflict')) {
        throw new ApiError({
          statusCode: 409,
          code: 'version_conflict',
          title: 'Version conflict',
          detail: 'The movement profile changed since it was loaded.',
        });
      }
      throw dependencyError('The profile version could not be updated.');
    }

    const next = typeof nextVersion === 'number' ? nextVersion : expectedVersion + 1;
    const deletes = await Promise.all([
      this.client.from('user_body_regions').delete().eq('user_id', userId),
      this.client.from('user_capabilities').delete().eq('user_id', userId),
      this.client.from('user_equipment').delete().eq('user_id', userId),
      this.client.from('user_goals').delete().eq('user_id', userId),
    ]);
    if (deletes.some((result) => result.error)) {
      throw dependencyError('The movement profile selections could not be replaced.');
    }

    const bodyRows = Object.entries(profile.bodyRegions).map(([body_region_id, state]) => ({
      user_id: userId,
      body_region_id,
      state,
    }));
    const capabilityRows = Object.entries(profile.capabilities).map(([capability_id, state]) => ({
      user_id: userId,
      capability_id,
      state,
    }));
    const equipmentRows = profile.equipmentIds.map((equipment_id) => ({
      user_id: userId,
      equipment_id,
    }));
    const goalRows = profile.goalIds.map((goal_id, index) => ({
      user_id: userId,
      goal_id,
      priority: index + 1,
    }));
    const writes = await Promise.all([
      bodyRows.length === 0
        ? Promise.resolve({ error: null })
        : this.client.from('user_body_regions').insert(bodyRows),
      capabilityRows.length === 0
        ? Promise.resolve({ error: null })
        : this.client.from('user_capabilities').insert(capabilityRows),
      equipmentRows.length === 0
        ? Promise.resolve({ error: null })
        : this.client.from('user_equipment').insert(equipmentRows),
      goalRows.length === 0
        ? Promise.resolve({ error: null })
        : this.client.from('user_goals').insert(goalRows),
      this.client
        .from('profiles')
        .update({ intensity_preference: profile.intensityPreference })
        .eq('user_id', userId),
    ]);
    if (writes.some((result) => result.error)) {
      throw dependencyError('The movement profile could not be saved.');
    }
    return { ...profile, version: next };
  }
}
