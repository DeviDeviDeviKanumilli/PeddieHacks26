import type { Settings, SettingsPatch, UserProfile, UserProfilePatch } from '@peddie/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from './errors.js';
import type { SupabaseClientFactory } from './supabase-client.js';

// owner profile/settings. nested patches merge; never replace the whole json blob blindly.
export interface UserRepository {
  getProfile(userId: string, accessToken?: string): Promise<UserProfile>;
  patchProfile(userId: string, patch: UserProfilePatch, accessToken?: string): Promise<UserProfile>;
  getSettings(userId: string, accessToken?: string): Promise<Settings>;
  patchSettings(userId: string, patch: SettingsPatch, accessToken?: string): Promise<Settings>;
}

const defaultSettings = (): Settings => ({
  accessibilityPreferences: {},
  feedbackPreferences: {},
  poseOverlayEnabled: true,
  defaultRestDurationSeconds: 60,
});

// guest/test store. missing rows look like a fresh onboarding profile, not 404.
export class MemoryUserRepository implements UserRepository {
  private readonly profiles = new Map<string, UserProfile>();
  private readonly settings = new Map<string, Settings>();

  async getProfile(userId: string): Promise<UserProfile> {
    return (
      this.profiles.get(userId) ?? {
        userId,
        displayName: null,
        timezone: 'UTC',
        experienceLevel: 'beginner',
        intensityPreference: 'standard',
        onboardingCompletedAt: null,
      }
    );
  }

  async patchProfile(userId: string, patch: UserProfilePatch): Promise<UserProfile> {
    const current = await this.getProfile(userId);
    const next: UserProfile = {
      ...current,
      ...(patch.displayName === undefined ? {} : { displayName: patch.displayName }),
      ...(patch.timezone === undefined ? {} : { timezone: patch.timezone }),
      ...(patch.experienceLevel === undefined ? {} : { experienceLevel: patch.experienceLevel }),
      ...(patch.intensityPreference === undefined
        ? {}
        : { intensityPreference: patch.intensityPreference }),
    };
    this.profiles.set(userId, next);
    return next;
  }

  async getSettings(userId: string): Promise<Settings> {
    return this.settings.get(userId) ?? defaultSettings();
  }

  async patchSettings(userId: string, patch: SettingsPatch): Promise<Settings> {
    const current = await this.getSettings(userId);
    const next: Settings = {
      ...current,
      ...(patch.accessibilityPreferences === undefined
        ? {}
        : {
            // merge nested maps so a spoken-feedback patch does not wipe reduced-motion.
            accessibilityPreferences: {
              ...current.accessibilityPreferences,
              ...patch.accessibilityPreferences,
            },
          }),
      ...(patch.feedbackPreferences === undefined
        ? {}
        : {
            feedbackPreferences: { ...current.feedbackPreferences, ...patch.feedbackPreferences },
          }),
      ...(patch.poseOverlayEnabled === undefined
        ? {}
        : { poseOverlayEnabled: patch.poseOverlayEnabled }),
      ...(patch.defaultRestDurationSeconds === undefined
        ? {}
        : { defaultRestDurationSeconds: patch.defaultRestDurationSeconds }),
    };
    this.settings.set(userId, next);
    return next;
  }
}

type Row = Record<string, unknown>;
const rowRecord = (value: unknown): Row =>
  typeof value === 'object' && value !== null ? (value as Row) : {};
const dependencyError = (detail: string): ApiError =>
  new ApiError({
    statusCode: 503,
    code: 'dependency_unavailable',
    title: 'User data unavailable',
    detail,
  });

// stamp the request jwt or hosted rls will hide the row even when userid is correct.
export class SupabaseUserRepository implements UserRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly clientFactory?: SupabaseClientFactory,
  ) {}

  async getProfile(userId: string, accessToken?: string): Promise<UserProfile> {
    const client = this.clientFactory?.(accessToken) ?? this.client;
    const result = await client
      .from('profiles')
      .select(
        'user_id,display_name,timezone,experience_level,intensity_preference,onboarding_completed_at',
      )
      .eq('user_id', userId)
      .maybeSingle();
    if (result.error) throw dependencyError('The profile dependency could not be reached.');
    const row = rowRecord(result.data);
    return {
      userId,
      displayName: typeof row.display_name === 'string' ? row.display_name : null,
      timezone: typeof row.timezone === 'string' ? row.timezone : 'UTC',
      experienceLevel:
        row.experience_level === 'intermediate' || row.experience_level === 'advanced'
          ? row.experience_level
          : 'beginner',
      intensityPreference:
        row.intensity_preference === 'low' || row.intensity_preference === 'high'
          ? row.intensity_preference
          : 'standard',
      onboardingCompletedAt:
        typeof row.onboarding_completed_at === 'string' ? row.onboarding_completed_at : null,
    };
  }

  async patchProfile(
    userId: string,
    patch: UserProfilePatch,
    accessToken?: string,
  ): Promise<UserProfile> {
    const client = this.clientFactory?.(accessToken) ?? this.client;
    const result = await client
      .from('profiles')
      .update({
        ...(patch.displayName === undefined ? {} : { display_name: patch.displayName }),
        ...(patch.timezone === undefined ? {} : { timezone: patch.timezone }),
        ...(patch.experienceLevel === undefined ? {} : { experience_level: patch.experienceLevel }),
        ...(patch.intensityPreference === undefined
          ? {}
          : { intensity_preference: patch.intensityPreference }),
      })
      .eq('user_id', userId)
      .select(
        'user_id,display_name,timezone,experience_level,intensity_preference,onboarding_completed_at',
      )
      .maybeSingle();
    if (result.error) throw dependencyError('The profile could not be updated.');
    if (result.data === null)
      throw new ApiError({
        statusCode: 404,
        code: 'profile_not_found',
        title: 'Profile not found',
        detail: 'The signed-in user profile is not available.',
      });
    return this.getProfile(userId, accessToken);
  }

  async getSettings(userId: string, accessToken?: string): Promise<Settings> {
    const client = this.clientFactory?.(accessToken) ?? this.client;
    const result = await client
      .from('user_settings')
      .select(
        'accessibility_preferences,feedback_preferences,pose_overlay_enabled,default_rest_duration_seconds',
      )
      .eq('user_id', userId)
      .maybeSingle();
    if (result.error) throw dependencyError('The settings dependency could not be reached.');
    const row = rowRecord(result.data);
    const defaults = defaultSettings();
    return {
      accessibilityPreferences: rowRecord(
        row.accessibility_preferences,
      ) as Settings['accessibilityPreferences'],
      feedbackPreferences: rowRecord(row.feedback_preferences) as Settings['feedbackPreferences'],
      poseOverlayEnabled:
        typeof row.pose_overlay_enabled === 'boolean'
          ? row.pose_overlay_enabled
          : defaults.poseOverlayEnabled,
      defaultRestDurationSeconds:
        typeof row.default_rest_duration_seconds === 'number'
          ? row.default_rest_duration_seconds
          : defaults.defaultRestDurationSeconds,
    };
  }

  async patchSettings(
    userId: string,
    patch: SettingsPatch,
    accessToken?: string,
  ): Promise<Settings> {
    const client = this.clientFactory?.(accessToken) ?? this.client;
    // read-merge-write so a partial patch cannot clobber the other preference object.
    const current = await this.getSettings(userId, accessToken);
    const next = {
      ...current,
      ...(patch.accessibilityPreferences === undefined
        ? {}
        : {
            accessibilityPreferences: {
              ...current.accessibilityPreferences,
              ...patch.accessibilityPreferences,
            },
          }),
      ...(patch.feedbackPreferences === undefined
        ? {}
        : {
            feedbackPreferences: { ...current.feedbackPreferences, ...patch.feedbackPreferences },
          }),
      ...(patch.poseOverlayEnabled === undefined
        ? {}
        : { poseOverlayEnabled: patch.poseOverlayEnabled }),
      ...(patch.defaultRestDurationSeconds === undefined
        ? {}
        : { defaultRestDurationSeconds: patch.defaultRestDurationSeconds }),
    } satisfies Settings;
    const result = await client
      .from('user_settings')
      .update({
        accessibility_preferences: next.accessibilityPreferences,
        feedback_preferences: next.feedbackPreferences,
        pose_overlay_enabled: next.poseOverlayEnabled,
        default_rest_duration_seconds: next.defaultRestDurationSeconds,
      })
      .eq('user_id', userId);
    if (result.error) throw dependencyError('The settings could not be updated.');
    return next;
  }
}
