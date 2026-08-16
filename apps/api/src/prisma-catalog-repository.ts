import type { ExerciseDetail, ExerciseSummary } from '@peddie/contracts';
import type { ExerciseCandidate } from '@peddie/domain';
import type {
  BodyRegionReference,
  CatalogRepository,
  EquipmentReference,
  ExerciseListFilters,
  ExercisePage,
  ReferenceData,
  ReferenceEntry,
} from './catalog-repository.js';
import { ApiError } from './errors.js';
import type { Prisma, PrismaClient } from './generated/prisma/client.js';
import { withAnonymousPrismaContext } from './prisma-client.js';

// public catalog through postgres rls as anon. no user jwt needed.

const dependencyError = (detail: string): ApiError =>
  new ApiError({
    statusCode: 503,
    code: 'dependency_unavailable',
    title: 'Exercise catalog unavailable',
    detail,
  });

const encodeCursor = (slug: string): string =>
  Buffer.from(JSON.stringify({ slug }), 'utf8').toString('base64url');

const decodeCursor = (cursor: string): string => {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (
      typeof value !== 'object' ||
      value === null ||
      !('slug' in value) ||
      typeof value.slug !== 'string' ||
      value.slug.length === 0
    ) {
      throw new Error('invalid cursor');
    }
    return value.slug;
  } catch {
    throw new ApiError({
      statusCode: 400,
      code: 'invalid_cursor',
      title: 'Invalid cursor',
      detail: 'The pagination cursor is invalid or expired.',
    });
  }
};

const isUuid = (value: string): boolean =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value,
  );

const prescriptionFor = (value: unknown): ExerciseSummary['defaultPrescription'] =>
  value as ExerciseSummary['defaultPrescription'];

const stringArrayFor = (value: Prisma.JsonValue): string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : [];

const mapSummary = (row: {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly category: string;
  readonly position: string;
  readonly difficulty: number;
  readonly default_prescription: Prisma.JsonValue;
  readonly content_version: number;
  readonly exercise_tracking_profiles: { readonly exercise_id: string } | null;
}): ExerciseSummary => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  summary: row.summary,
  category: row.category as ExerciseSummary['category'],
  position: row.position as ExerciseSummary['position'],
  difficulty: row.difficulty as ExerciseSummary['difficulty'],
  defaultPrescription: prescriptionFor(row.default_prescription),
  trackingSupported: row.exercise_tracking_profiles !== null,
  contentVersion: row.content_version,
});

type CatalogExercise = {
  readonly id: string;
  readonly slug: string;
  readonly family_key: string;
  readonly name: string;
  readonly category: string;
  readonly position: string;
  readonly difficulty: number;
  readonly default_prescription: Prisma.JsonValue;
  readonly exercise_body_demands: readonly {
    readonly body_region_id: string;
    readonly involvement: string;
    readonly demand: string;
  }[];
  readonly exercise_capability_demands: readonly {
    readonly capability_id: string;
    readonly demand: string;
    readonly required: boolean;
  }[];
  readonly exercise_equipment_options: readonly {
    readonly equipment_id: string;
    readonly mode: string;
    readonly or_group: string | null;
  }[];
  readonly exercise_goals: readonly { readonly goal_id: string }[];
  readonly exercise_tracking_profiles: { readonly tracking_key: string } | null;
};

const mapCandidate = (row: CatalogExercise): ExerciseCandidate => {
  const prescription = row.default_prescription as Record<string, unknown>;
  const bodyDemands = row.exercise_body_demands.map((demand) => ({
    regionId: demand.body_region_id,
    involvement: demand.involvement as ExerciseCandidate['bodyDemands'][number]['involvement'],
    demand: demand.demand as ExerciseCandidate['bodyDemands'][number]['demand'],
  }));
  return {
    id: row.id,
    slug: row.slug,
    familyKey: row.family_key,
    name: row.name,
    category: row.category as ExerciseCandidate['category'],
    position: row.position as ExerciseCandidate['position'],
    difficulty: row.difficulty as ExerciseCandidate['difficulty'],
    active: true,
    defaultPrescription: {
      sets: typeof prescription.sets === 'number' ? prescription.sets : 1,
      restSeconds: typeof prescription.restSeconds === 'number' ? prescription.restSeconds : 45,
      ...(typeof prescription.reps === 'number' ? { reps: prescription.reps } : {}),
      ...(typeof prescription.holdSeconds === 'number'
        ? { holdSeconds: prescription.holdSeconds }
        : {}),
    },
    estimatedSecondsPerSet: 45,
    bodyDemands,
    capabilityDemands: row.exercise_capability_demands.map((demand) => ({
      capabilityId: demand.capability_id,
      demand: demand.demand as ExerciseCandidate['capabilityDemands'][number]['demand'],
      required: demand.required,
    })),
    equipmentOptions: row.exercise_equipment_options.map((option) => ({
      equipmentId: option.equipment_id,
      mode: option.mode as ExerciseCandidate['equipmentOptions'][number]['mode'],
      ...(option.or_group === null ? {} : { orGroup: option.or_group }),
    })),
    primaryRegionIds: bodyDemands
      .filter((demand) => demand.involvement === 'primary')
      .map((demand) => demand.regionId),
    goalIds: row.exercise_goals.map((goal) => goal.goal_id),
    ...(row.exercise_tracking_profiles === null
      ? {}
      : { trackingProfileKey: row.exercise_tracking_profiles.tracking_key }),
  };
};

const referenceEntry = (row: {
  readonly id: string;
  readonly label: string;
  readonly sort_order: number;
}): ReferenceEntry => ({ id: row.id, label: row.label, sortOrder: row.sort_order });

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly database: PrismaClient) {}

  async getReferenceData(): Promise<ReferenceData> {
    try {
      // anon role: catalog is public. using authenticated here would still work but hides intent.
      return await withAnonymousPrismaContext(this.database, async (database) => {
        const [bodyRegions, capabilities, equipment, goals, muscleGroups] = await Promise.all([
          database.body_regions.findMany({
            where: { active: true },
            orderBy: { sort_order: 'asc' },
            select: { id: true, label: true, side: true, parent_id: true, sort_order: true },
          }),
          database.capabilities.findMany({
            where: { active: true },
            orderBy: { sort_order: 'asc' },
            select: { id: true, label: true, sort_order: true },
          }),
          database.equipment.findMany({
            where: { active: true },
            orderBy: { sort_order: 'asc' },
            select: { id: true, label: true, category: true, sort_order: true },
          }),
          database.goals.findMany({
            where: { active: true },
            orderBy: { sort_order: 'asc' },
            select: { id: true, label: true, sort_order: true },
          }),
          database.muscle_groups.findMany({
            where: { active: true },
            orderBy: { sort_order: 'asc' },
            select: { id: true, label: true, sort_order: true },
          }),
        ]);
        return {
          bodyRegions: bodyRegions.map((row) => ({
            ...referenceEntry(row),
            side: row.side as BodyRegionReference['side'],
            ...(row.parent_id === null ? {} : { parentId: row.parent_id }),
          })),
          capabilities: capabilities.map(referenceEntry),
          equipment: equipment.map((row) => ({
            ...referenceEntry(row),
            category: row.category,
          })) as readonly EquipmentReference[],
          goals: goals.map(referenceEntry),
          muscleGroups: muscleGroups.map(referenceEntry),
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The catalog dependency could not be reached.');
    }
  }

  async listExerciseCandidates(): Promise<readonly ExerciseCandidate[]> {
    try {
      return await withAnonymousPrismaContext(this.database, async (database) => {
        const rows = await database.exercises.findMany({
          where: { active: true },
          orderBy: { slug: 'asc' },
          include: {
            exercise_body_demands: true,
            exercise_capability_demands: true,
            exercise_equipment_options: true,
            exercise_goals: true,
            exercise_tracking_profiles: { select: { tracking_key: true } },
          },
        });
        return rows.map(mapCandidate);
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The catalog dependency could not be reached.');
    }
  }

  async listExercises(filters: ExerciseListFilters): Promise<ExercisePage> {
    try {
      // filter in sql where we can; cursor still uses slug so it matches the memory adapter.
      return await withAnonymousPrismaContext(this.database, async (database) => {
        const where: Prisma.exercisesWhereInput = { active: true };
        if (filters.category !== undefined) where.category = filters.category;
        if (filters.position !== undefined) where.position = filters.position;
        if (filters.difficulty !== undefined) where.difficulty = filters.difficulty;
        if (filters.search !== undefined && filters.search.trim().length > 0) {
          const search = filters.search.trim();
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ];
        }
        if (filters.bodyRegionId !== undefined) {
          where.exercise_body_demands = { some: { body_region_id: filters.bodyRegionId } };
        }
        if (filters.equipmentId !== undefined) {
          where.exercise_equipment_options = { some: { equipment_id: filters.equipmentId } };
        }
        if (filters.trackingSupported !== undefined) {
          where.exercise_tracking_profiles = filters.trackingSupported
            ? { isNot: null }
            : { is: null };
        }
        const rows = await database.exercises.findMany({
          where,
          orderBy:
            filters.sort === 'name'
              ? [{ name: 'asc' }, { slug: 'asc' }]
              : filters.sort === 'difficulty'
                ? [{ difficulty: 'asc' }, { slug: 'asc' }]
                : { slug: 'asc' },
          select: {
            id: true,
            slug: true,
            name: true,
            summary: true,
            category: true,
            position: true,
            difficulty: true,
            default_prescription: true,
            content_version: true,
            exercise_tracking_profiles: { select: { exercise_id: true } },
          },
        });
        let filtered = rows;
        if (filters.cursor !== undefined) {
          const cursorSlug = decodeCursor(filters.cursor);
          const index = rows.findIndex((row) => row.slug === cursorSlug);
          if (index === -1) {
            throw new ApiError({
              statusCode: 400,
              code: 'invalid_cursor',
              title: 'Invalid cursor',
              detail: 'The pagination cursor does not belong to this collection.',
            });
          }
          filtered = rows.slice(index + 1);
        }
        const pageRows = filtered.slice(0, filters.limit);
        const hasMore = filtered.length > pageRows.length;
        return {
          data: pageRows.map(mapSummary),
          page: {
            hasMore,
            nextCursor: hasMore ? encodeCursor(pageRows.at(-1)?.slug ?? '') : null,
          },
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The catalog dependency could not be reached.');
    }
  }

  async getExercise(idOrSlug: string): Promise<ExerciseDetail | null> {
    try {
      return await withAnonymousPrismaContext(this.database, async (database) => {
        const row = await database.exercises.findFirst({
          where: { active: true, ...(isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }) },
          select: {
            id: true,
            slug: true,
            name: true,
            summary: true,
            category: true,
            position: true,
            difficulty: true,
            default_prescription: true,
            instructions: true,
            safety_cues: true,
            adaptations: true,
            content_version: true,
            exercise_tracking_profiles: { select: { tracking_key: true, version: true } },
            exercise_body_demands: {
              select: { body_region_id: true, involvement: true, demand: true },
            },
            exercise_capability_demands: {
              select: { capability_id: true, demand: true, required: true },
            },
            exercise_equipment_options: {
              select: { equipment_id: true, mode: true, or_group: true },
            },
            exercise_muscles: {
              select: { muscle_group_id: true, role: true, intensity: true },
            },
            exercise_source_links: {
              where: { exercise_sources: { review_status: 'approved' } },
              select: {
                exercise_sources: {
                  select: { title: true, publisher: true, url: true, publication_year: true },
                },
              },
            },
          },
        });
        if (row === null) return null;
        return {
          ...mapSummary({
            ...row,
            exercise_tracking_profiles:
              row.exercise_tracking_profiles === null ? null : { exercise_id: row.id },
          }),
          instructions: stringArrayFor(row.instructions),
          safetyCues: stringArrayFor(row.safety_cues),
          adaptations: stringArrayFor(row.adaptations),
          bodyDemands: row.exercise_body_demands.map((demand) => ({
            regionId: demand.body_region_id,
            involvement: demand.involvement as ExerciseDetail['bodyDemands'][number]['involvement'],
            demand: demand.demand as ExerciseDetail['bodyDemands'][number]['demand'],
          })),
          capabilityDemands: row.exercise_capability_demands.map((demand) => ({
            capabilityId: demand.capability_id,
            demand: demand.demand as ExerciseDetail['capabilityDemands'][number]['demand'],
            required: demand.required,
          })),
          equipmentOptions: row.exercise_equipment_options.map((option) => ({
            equipmentId: option.equipment_id,
            mode: option.mode as ExerciseDetail['equipmentOptions'][number]['mode'],
            ...(option.or_group === null ? {} : { orGroup: option.or_group }),
          })),
          muscles: row.exercise_muscles.map((muscle) => ({
            muscleGroupId: muscle.muscle_group_id,
            role: muscle.role as ExerciseDetail['muscles'][number]['role'],
            intensity: muscle.intensity,
          })),
          sources: row.exercise_source_links.map(({ exercise_sources: source }) => ({
            title: source.title,
            publisher: source.publisher,
            url: source.url,
            publicationYear: source.publication_year,
          })),
          trackingProfile:
            row.exercise_tracking_profiles === null
              ? null
              : {
                  key: row.exercise_tracking_profiles.tracking_key,
                  version: row.exercise_tracking_profiles.version,
                },
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The catalog dependency could not be reached.');
    }
  }

  async getExerciseCandidate(idOrSlug: string): Promise<ExerciseCandidate | null> {
    try {
      return await withAnonymousPrismaContext(this.database, async (database) => {
        const row = await database.exercises.findFirst({
          where: { active: true, ...(isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }) },
          include: {
            exercise_body_demands: true,
            exercise_capability_demands: true,
            exercise_equipment_options: true,
            exercise_goals: true,
            exercise_tracking_profiles: { select: { tracking_key: true } },
          },
        });
        return row === null ? null : mapCandidate(row);
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError('The catalog dependency could not be reached.');
    }
  }
}
