import type { Settings, SettingsPatch, UserProfile, UserProfilePatch } from '@peddie/contracts';
import { ApiError } from './errors.js';
import type { Prisma, PrismaClient } from './generated/prisma/client.js';
import { withUserPrismaContext } from './prisma-client.js';
import type { UserRepository } from './user-repository.js';

const defaultSettings = (): Settings => ({
  accessibilityPreferences: {},
  feedbackPreferences: {},
  poseOverlayEnabled: true,
  defaultRestDurationSeconds: 60,
});

const dependencyError = (detail: string): ApiError =>
  new ApiError({
    statusCode: 503,
    code: 'dependency_unavailable',
    title: 'User data unavailable',
    detail,
  });

const jsonObject = (value: Prisma.JsonValue | null | undefined): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const jsonInput = (value: Record<string, unknown>): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

const mapProfile = (
  userId: string,
  row: {
    readonly display_name: string | null;
    readonly timezone: string;
    readonly experience_level: string;
    readonly intensity_preference: string;
    readonly onboarding_completed_at: Date | null;
  },
): UserProfile => ({
  userId,
  displayName: row.display_name,
  timezone: row.timezone,
  experienceLevel:
    row.experience_level === 'intermediate' || row.experience_level === 'advanced'
      ? row.experience_level
      : 'beginner',
  intensityPreference:
    row.intensity_preference === 'low' || row.intensity_preference === 'high'
      ? row.intensity_preference
      : 'standard',
  onboardingCompletedAt: row.onboarding_completed_at?.toISOString() ?? null,
});

const mapSettings = (
  row: {
    readonly accessibility_preferences: Prisma.JsonValue;
    readonly feedback_preferences: Prisma.JsonValue;
    readonly pose_overlay_enabled: boolean;
    readonly default_rest_duration_seconds: number;
  } | null,
): Settings => {
  const defaults = defaultSettings();
  return {
    accessibilityPreferences: jsonObject(
      row?.accessibility_preferences,
    ) as Settings['accessibilityPreferences'],
    feedbackPreferences: jsonObject(row?.feedback_preferences) as Settings['feedbackPreferences'],
    poseOverlayEnabled: row?.pose_overlay_enabled ?? defaults.poseOverlayEnabled,
    defaultRestDurationSeconds:
      row?.default_rest_duration_seconds ?? defaults.defaultRestDurationSeconds,
  };
};

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly database: PrismaClient) {}

  async getProfile(userId: string): Promise<UserProfile> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const row = await database.profiles.findUnique({
          where: { user_id: userId },
          select: {
            display_name: true,
            timezone: true,
            experience_level: true,
            intensity_preference: true,
            onboarding_completed_at: true,
          },
        });
        if (row === null) {
          throw new ApiError({
            statusCode: 404,
            code: 'profile_not_found',
            title: 'Profile not found',
            detail: 'The signed-in user profile is not available.',
          });
        }
        return mapProfile(userId, row);
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The profile dependency could not be reached.');
    }
  }

  async patchProfile(userId: string, patch: UserProfilePatch): Promise<UserProfile> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const updated = await database.profiles.updateMany({
          where: { user_id: userId },
          data: {
            ...(patch.displayName === undefined ? {} : { display_name: patch.displayName }),
            ...(patch.timezone === undefined ? {} : { timezone: patch.timezone }),
            ...(patch.experienceLevel === undefined
              ? {}
              : { experience_level: patch.experienceLevel }),
            ...(patch.intensityPreference === undefined
              ? {}
              : { intensity_preference: patch.intensityPreference }),
          },
        });
        if (updated.count !== 1) {
          throw new ApiError({
            statusCode: 404,
            code: 'profile_not_found',
            title: 'Profile not found',
            detail: 'The signed-in user profile is not available.',
          });
        }
        const row = await database.profiles.findUniqueOrThrow({
          where: { user_id: userId },
          select: {
            display_name: true,
            timezone: true,
            experience_level: true,
            intensity_preference: true,
            onboarding_completed_at: true,
          },
        });
        return mapProfile(userId, row);
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The profile could not be updated.');
    }
  }

  async getSettings(userId: string): Promise<Settings> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const row = await database.user_settings.findUnique({
          where: { user_id: userId },
          select: {
            accessibility_preferences: true,
            feedback_preferences: true,
            pose_overlay_enabled: true,
            default_rest_duration_seconds: true,
          },
        });
        return mapSettings(row);
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The settings dependency could not be reached.');
    }
  }

  async patchSettings(userId: string, patch: SettingsPatch): Promise<Settings> {
    try {
      return await withUserPrismaContext(this.database, userId, async (database) => {
        const current = await database.user_settings.findUnique({
          where: { user_id: userId },
          select: {
            accessibility_preferences: true,
            feedback_preferences: true,
            pose_overlay_enabled: true,
            default_rest_duration_seconds: true,
          },
        });
        const currentSettings = mapSettings(current);
        const next: Settings = {
          ...currentSettings,
          ...(patch.accessibilityPreferences === undefined
            ? {}
            : {
                accessibilityPreferences: {
                  ...currentSettings.accessibilityPreferences,
                  ...patch.accessibilityPreferences,
                },
              }),
          ...(patch.feedbackPreferences === undefined
            ? {}
            : {
                feedbackPreferences: {
                  ...currentSettings.feedbackPreferences,
                  ...patch.feedbackPreferences,
                },
              }),
          ...(patch.poseOverlayEnabled === undefined
            ? {}
            : { poseOverlayEnabled: patch.poseOverlayEnabled }),
          ...(patch.defaultRestDurationSeconds === undefined
            ? {}
            : { defaultRestDurationSeconds: patch.defaultRestDurationSeconds }),
        };
        const updated = await database.user_settings.updateMany({
          where: { user_id: userId },
          data: {
            accessibility_preferences: jsonInput(next.accessibilityPreferences),
            feedback_preferences: jsonInput(next.feedbackPreferences),
            pose_overlay_enabled: next.poseOverlayEnabled,
            default_rest_duration_seconds: next.defaultRestDurationSeconds,
          },
        });
        if (updated.count !== 1) {
          throw new ApiError({
            statusCode: 404,
            code: 'settings_not_found',
            title: 'Settings not found',
            detail: 'The signed-in user settings are not available.',
          });
        }
        return next;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The settings could not be updated.');
    }
  }
}
