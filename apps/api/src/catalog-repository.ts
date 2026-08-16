import type { ExerciseDetail, ExerciseSummary } from '@peddie/contracts';
import { CURATED_EXERCISES, type ExerciseCandidate, type MovementProfile } from '@peddie/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from './errors.js';

// public catalog + movement-profile interface. scoring does not live here.

export interface ReferenceEntry {
  readonly id: string;
  readonly label: string;
  readonly sortOrder: number;
}

export interface BodyRegionReference extends ReferenceEntry {
  readonly side: 'central' | 'left' | 'right';
  readonly parentId?: string;
}

export interface EquipmentReference extends ReferenceEntry {
  readonly category: string;
}

export interface ReferenceData {
  readonly bodyRegions: readonly BodyRegionReference[];
  readonly capabilities: readonly ReferenceEntry[];
  readonly equipment: readonly EquipmentReference[];
  readonly goals: readonly ReferenceEntry[];
  readonly muscleGroups: readonly ReferenceEntry[];
}

export interface ExerciseListFilters {
  search?: string;
  bodyRegionId?: string;
  category?: ExerciseSummary['category'];
  position?: ExerciseSummary['position'];
  equipmentId?: string;
  difficulty?: number;
  trackingSupported?: boolean;
  sort?: 'slug' | 'name' | 'difficulty';
  limit: number;
  cursor?: string;
}

export interface ExercisePage {
  readonly data: readonly ExerciseSummary[];
  readonly page: { readonly nextCursor: string | null; readonly hasMore: boolean };
}

export interface CatalogRepository {
  getReferenceData(): Promise<ReferenceData>;
  listExerciseCandidates(): Promise<readonly ExerciseCandidate[]>;
  listExercises(filters: ExerciseListFilters): Promise<ExercisePage>;
  getExercise(idOrSlug: string): Promise<ExerciseDetail | null>;
  getExerciseCandidate(idOrSlug: string): Promise<ExerciseCandidate | null>;
}

export interface MovementProfileRepository {
  // accesstoken is for rls on hosted supabase. memory/prisma adapters ignore it.
  getMovementProfile(userId: string, accessToken?: string): Promise<MovementProfile>;
  putMovementProfile(
    userId: string,
    expectedVersion: number,
    profile: Omit<MovementProfile, 'version'>,
    accessToken?: string,
  ): Promise<MovementProfile>;
}

const encodeCursor = (slug: string): string =>
  Buffer.from(JSON.stringify({ slug }), 'utf8').toString('base64url');

// opaque on purpose so clients do not depend on slug-as-offset. garbage in => 400, not empty page.
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

const prescriptionFor = (candidate: ExerciseCandidate): ExerciseSummary['defaultPrescription'] => {
  const base = {
    sets: candidate.defaultPrescription.sets,
    restSeconds: candidate.defaultPrescription.restSeconds,
  };
  if (candidate.defaultPrescription.reps !== undefined) {
    return { ...base, reps: candidate.defaultPrescription.reps };
  }
  return { ...base, holdSeconds: candidate.defaultPrescription.holdSeconds ?? 30 };
};

const summaryFor = (candidate: ExerciseCandidate): ExerciseSummary => ({
  id: candidate.id,
  slug: candidate.slug,
  name: candidate.name,
  summary: 'General-wellness movement with adjustable range, load, pace, and support.',
  category: candidate.category,
  position: candidate.position,
  difficulty: candidate.difficulty,
  defaultPrescription: prescriptionFor(candidate),
  trackingSupported: candidate.trackingProfileKey !== undefined,
  contentVersion: 1,
});

const detailFor = (candidate: ExerciseCandidate): ExerciseDetail => ({
  ...summaryFor(candidate),
  instructions: [
    'Set up in a stable position and choose a comfortable range.',
    'Move slowly with control while breathing normally.',
    'Return to the starting position before the next repetition.',
  ],
  safetyCues: [
    'Stop for sharp pain, dizziness, or unexpected symptoms.',
    'Reduce the range, load, or pace whenever control changes.',
  ],
  adaptations: [
    'Use a smaller range or fewer repetitions.',
    'Add stable support or choose the seated alternative when available.',
  ],
  bodyDemands: [...candidate.bodyDemands],
  capabilityDemands: [...candidate.capabilityDemands],
  equipmentOptions: [...candidate.equipmentOptions],
  muscles: [
    {
      muscleGroupId: candidate.primaryRegionIds.at(0) ?? 'general',
      role: 'primary',
      intensity: Math.max(1, Math.min(5, candidate.difficulty + 1)),
    },
  ],
  sources: [
    {
      title: 'AdaptFit reviewed general-wellness exercise catalog',
      publisher: 'AdaptFit',
      url: 'https://www.cdc.gov/physical-activity/php/about/index.html',
      publicationYear: null,
    },
  ],
  trackingProfile:
    candidate.trackingProfileKey === undefined
      ? null
      : { key: candidate.trackingProfileKey, version: 1 },
});

const referenceData: ReferenceData = {
  bodyRegions: [
    { id: 'head_neck', label: 'Head and neck', side: 'central', sortOrder: 10 },
    { id: 'torso', label: 'Torso', side: 'central', sortOrder: 20 },
    { id: 'pelvis', label: 'Pelvis', side: 'central', sortOrder: 30 },
    { id: 'upper_body', label: 'Upper body', side: 'central', sortOrder: 40 },
    { id: 'lower_body', label: 'Lower body', side: 'central', sortOrder: 50 },
    { id: 'shoulders', label: 'Shoulders', side: 'central', sortOrder: 60, parentId: 'upper_body' },
    {
      id: 'upper_back',
      label: 'Upper back',
      side: 'central',
      sortOrder: 65,
      parentId: 'upper_body',
    },
    {
      id: 'upper_arms',
      label: 'Upper arms',
      side: 'central',
      sortOrder: 70,
      parentId: 'upper_body',
    },
    { id: 'elbows', label: 'Elbows', side: 'central', sortOrder: 80, parentId: 'upper_body' },
    {
      id: 'forearms_hands',
      label: 'Forearms and hands',
      side: 'central',
      sortOrder: 90,
      parentId: 'upper_body',
    },
    { id: 'lower_back', label: 'Lower back', side: 'central', sortOrder: 95, parentId: 'torso' },
    { id: 'hips', label: 'Hips', side: 'central', sortOrder: 100, parentId: 'lower_body' },
    { id: 'thighs', label: 'Thighs', side: 'central', sortOrder: 110, parentId: 'lower_body' },
    { id: 'knees', label: 'Knees', side: 'central', sortOrder: 120, parentId: 'lower_body' },
    {
      id: 'lower_legs',
      label: 'Lower legs',
      side: 'central',
      sortOrder: 130,
      parentId: 'lower_body',
    },
    {
      id: 'ankles_feet',
      label: 'Ankles and feet',
      side: 'central',
      sortOrder: 140,
      parentId: 'lower_body',
    },
  ],
  capabilities: [
    'seated_posture',
    'standing',
    'standing_balance',
    'floor_transfer',
    'supine',
    'prone',
    'kneeling',
    'overhead_reach',
    'forward_bend',
    'torso_rotation',
    'left_grip',
    'right_grip',
    'left_upper_body_weight_bearing',
    'right_upper_body_weight_bearing',
    'left_lower_body_weight_bearing',
    'right_lower_body_weight_bearing',
    'left_single_leg_balance',
    'right_single_leg_balance',
  ].map((id, index) => ({ id, label: id.replaceAll('_', ' '), sortOrder: (index + 1) * 10 })),
  equipment: [
    { id: 'dumbbells', label: 'Dumbbells or light hand weights', category: 'load', sortOrder: 10 },
    { id: 'resistance_band', label: 'Resistance band', category: 'load', sortOrder: 20 },
    { id: 'stable-chair', label: 'Stable chair', category: 'support', sortOrder: 30 },
    { id: 'wall', label: 'Clear wall', category: 'support', sortOrder: 40 },
    { id: 'ankle-weight', label: 'Ankle weight', category: 'load', sortOrder: 50 },
    { id: 'exercise-mat', label: 'Exercise mat', category: 'surface', sortOrder: 60 },
  ],
  goals: ['upper_body', 'lower_body', 'core', 'mobility', 'balance', 'cardio', 'strength'].map(
    (id, index) => ({ id, label: id.replaceAll('_', ' '), sortOrder: (index + 1) * 10 }),
  ),
  muscleGroups: [
    'shoulders',
    'upper_back',
    'chest',
    'arms',
    'core',
    'glutes',
    'quadriceps',
    'hamstrings',
    'calves',
    'ankles_feet',
  ].map((id, index) => ({ id, label: id.replaceAll('_', ' '), sortOrder: (index + 1) * 10 })),
};

// in-memory catalog for tests. also implements profiles so one fake covers guest mode.
export class MemoryCatalogRepository implements CatalogRepository, MovementProfileRepository {
  private readonly candidates = CURATED_EXERCISES;
  private readonly profiles = new Map<string, MovementProfile>();

  async getReferenceData(): Promise<ReferenceData> {
    return referenceData;
  }

  async listExerciseCandidates(): Promise<readonly ExerciseCandidate[]> {
    return this.candidates;
  }

  async listExercises(filters: ExerciseListFilters): Promise<ExercisePage> {
    const normalizedSearch = filters.search?.trim().toLowerCase();
    let results = this.candidates.filter((candidate) => {
      if (normalizedSearch !== undefined && normalizedSearch.length > 0) {
        const haystack = `${candidate.name} ${candidate.slug}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }
      if (
        filters.bodyRegionId !== undefined &&
        !candidate.primaryRegionIds.includes(filters.bodyRegionId)
      ) {
        return false;
      }
      if (filters.category !== undefined && candidate.category !== filters.category) {
        return false;
      }
      if (filters.position !== undefined && candidate.position !== filters.position) {
        return false;
      }
      if (filters.difficulty !== undefined && candidate.difficulty !== filters.difficulty) {
        return false;
      }
      if (
        filters.equipmentId !== undefined &&
        !candidate.equipmentOptions.some((option) => option.equipmentId === filters.equipmentId)
      ) {
        return false;
      }
      if (
        filters.trackingSupported !== undefined &&
        (candidate.trackingProfileKey !== undefined) !== filters.trackingSupported
      ) {
        return false;
      }
      return true;
    });
    results = [...results].sort((left, right) => {
      if (filters.sort === 'name' && left.name !== right.name) {
        return left.name.localeCompare(right.name);
      }
      if (filters.sort === 'difficulty' && left.difficulty !== right.difficulty) {
        return left.difficulty - right.difficulty;
      }
      return left.slug.localeCompare(right.slug);
    });

    if (filters.cursor !== undefined) {
      const cursorSlug = decodeCursor(filters.cursor);
      const cursorIndex = results.findIndex((candidate) => candidate.slug === cursorSlug);
      if (cursorIndex === -1) {
        throw new ApiError({
          statusCode: 400,
          code: 'invalid_cursor',
          title: 'Invalid cursor',
          detail: 'The pagination cursor does not belong to this collection.',
        });
      }
      results = results.slice(cursorIndex + 1);
    }

    const pageItems = results.slice(0, filters.limit);
    const hasMore = results.length > pageItems.length;
    return {
      data: pageItems.map(summaryFor),
      page: {
        hasMore,
        nextCursor: hasMore ? encodeCursor(pageItems.at(-1)?.slug ?? '') : null,
      },
    };
  }

  async getExercise(idOrSlug: string): Promise<ExerciseDetail | null> {
    const candidate = this.candidates.find(
      (item) => item.id === idOrSlug || item.slug === idOrSlug,
    );
    return candidate === undefined ? null : detailFor(candidate);
  }

  async getExerciseCandidate(idOrSlug: string): Promise<ExerciseCandidate | null> {
    return this.candidates.find((item) => item.id === idOrSlug || item.slug === idOrSlug) ?? null;
  }

  async getMovementProfile(userId: string): Promise<MovementProfile> {
    // empty default so compatibility still runs before onboarding finishes.
    return (
      this.profiles.get(userId) ?? {
        version: 1,
        bodyRegions: {},
        capabilities: {},
        equipmentIds: [],
        goalIds: [],
        intensityPreference: 'standard',
      }
    );
  }

  async putMovementProfile(
    userId: string,
    expectedVersion: number,
    profile: Omit<MovementProfile, 'version'>,
  ): Promise<MovementProfile> {
    const current = await this.getMovementProfile(userId);
    // same 409 as the sql rpc so clients do not need a memory-vs-hosted branch.
    if (current.version !== expectedVersion) {
      throw new ApiError({
        statusCode: 409,
        code: 'version_conflict',
        title: 'Version conflict',
        detail: 'The movement profile changed since it was loaded.',
      });
    }
    const next = { ...profile, version: current.version + 1 };
    this.profiles.set(userId, next);
    return next;
  }
}

type Row = Record<string, unknown>;

const rowRecord = (value: unknown): Row =>
  typeof value === 'object' && value !== null ? (value as Row) : {};
const rowString = (row: Row, key: string): string => {
  const value = row[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Catalog row is missing ${key}.`);
  }
  return value;
};
const rowNumber = (row: Row, key: string, fallback?: number): number => {
  const value = row[key];
  if (typeof value === 'number') {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Catalog row is missing ${key}.`);
};
const rowArray = (row: Row, key: string): readonly Row[] => {
  const value = row[key];
  return Array.isArray(value) ? value.map(rowRecord) : [];
};
const rowStringArray = (row: Row, key: string): string[] => {
  const value = row[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Catalog row is missing ${key}.`);
  }
  return value as string[];
};

const mapSupabaseSummary = (row: Row): ExerciseSummary => ({
  id: rowString(row, 'id'),
  slug: rowString(row, 'slug'),
  name: rowString(row, 'name'),
  summary: rowString(row, 'summary'),
  category: rowString(row, 'category') as ExerciseSummary['category'],
  position: rowString(row, 'position') as ExerciseSummary['position'],
  difficulty: rowNumber(row, 'difficulty') as ExerciseSummary['difficulty'],
  defaultPrescription: rowRecord(
    row.default_prescription,
  ) as ExerciseSummary['defaultPrescription'],
  trackingSupported: rowArray(row, 'exercise_tracking_profiles').length > 0,
  contentVersion: rowNumber(row, 'content_version', 1),
});

const mapSupabaseDetail = (row: Row): ExerciseDetail => {
  const tracking = rowArray(row, 'exercise_tracking_profiles').at(0);
  return {
    ...mapSupabaseSummary(row),
    instructions: rowStringArray(row, 'instructions'),
    safetyCues: rowStringArray(row, 'safety_cues'),
    adaptations: rowStringArray(row, 'adaptations'),
    bodyDemands: rowArray(row, 'exercise_body_demands').map((demand) => ({
      regionId: rowString(demand, 'body_region_id'),
      involvement: rowString(
        demand,
        'involvement',
      ) as ExerciseDetail['bodyDemands'][number]['involvement'],
      demand: rowString(demand, 'demand') as ExerciseDetail['bodyDemands'][number]['demand'],
    })),
    capabilityDemands: rowArray(row, 'exercise_capability_demands').map((demand) => ({
      capabilityId: rowString(demand, 'capability_id'),
      demand: rowString(demand, 'demand') as ExerciseDetail['capabilityDemands'][number]['demand'],
      required: demand.required === true,
    })),
    equipmentOptions: rowArray(row, 'exercise_equipment_options').map((option) => ({
      equipmentId: rowString(option, 'equipment_id'),
      mode: rowString(option, 'mode') as ExerciseDetail['equipmentOptions'][number]['mode'],
      ...(typeof option.or_group === 'string' ? { orGroup: option.or_group } : {}),
    })),
    muscles: rowArray(row, 'exercise_muscles').map((muscle) => ({
      muscleGroupId: rowString(muscle, 'muscle_group_id'),
      role: rowString(muscle, 'role') as ExerciseDetail['muscles'][number]['role'],
      intensity: rowNumber(muscle, 'intensity'),
    })),
    sources: rowArray(row, 'exercise_source_links').map((link) => {
      const source = rowRecord(link.exercise_sources);
      return {
        title: rowString(source, 'title'),
        publisher: rowString(source, 'publisher'),
        url: rowString(source, 'url'),
        publicationYear:
          typeof source.publication_year === 'number' ? source.publication_year : null,
      };
    }),
    trackingProfile:
      tracking === undefined
        ? null
        : {
            key: rowString(tracking, 'tracking_key'),
            version: rowNumber(tracking, 'version'),
          },
  };
};

// public tables, anon client is enough. do not stamp a user jwt here or we mix auth into catalog.
export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listExerciseCandidates(): Promise<readonly ExerciseCandidate[]> {
    const page = await this.listExercises({ limit: 100 });
    const candidates = await Promise.all(
      page.data.map((exercise) => this.getExerciseCandidate(exercise.id)),
    );
    return candidates.flatMap((candidate) => (candidate === null ? [] : [candidate]));
  }

  async getReferenceData(): Promise<ReferenceData> {
    const [bodyRegions, capabilities, equipment, goals, muscleGroups] = await Promise.all([
      this.client
        .from('body_regions')
        .select('id,label,side,parent_id,sort_order')
        .eq('active', true)
        .order('sort_order'),
      this.client
        .from('capabilities')
        .select('id,label,sort_order')
        .eq('active', true)
        .order('sort_order'),
      this.client
        .from('equipment')
        .select('id,label,category,sort_order')
        .eq('active', true)
        .order('sort_order'),
      this.client
        .from('goals')
        .select('id,label,sort_order')
        .eq('active', true)
        .order('sort_order'),
      this.client
        .from('muscle_groups')
        .select('id,label,sort_order')
        .eq('active', true)
        .order('sort_order'),
    ]);
    const failed = [bodyRegions, capabilities, equipment, goals, muscleGroups].find(
      (result) => result.error,
    );
    if (failed?.error) {
      throw new ApiError({
        statusCode: 503,
        code: 'dependency_unavailable',
        title: 'Reference data unavailable',
        detail: 'The catalog dependency could not be reached.',
      });
    }
    return {
      bodyRegions: (bodyRegions.data ?? []).map((value) => {
        const row = rowRecord(value);
        const parentId = row.parent_id;
        return {
          id: rowString(row, 'id'),
          label: rowString(row, 'label'),
          side: rowString(row, 'side') as BodyRegionReference['side'],
          sortOrder: rowNumber(row, 'sort_order'),
          ...(typeof parentId === 'string' ? { parentId } : {}),
        };
      }),
      capabilities: (capabilities.data ?? []).map((value) => {
        const row = rowRecord(value);
        return {
          id: rowString(row, 'id'),
          label: rowString(row, 'label'),
          sortOrder: rowNumber(row, 'sort_order'),
        };
      }),
      equipment: (equipment.data ?? []).map((value) => {
        const row = rowRecord(value);
        return {
          id: rowString(row, 'id'),
          label: rowString(row, 'label'),
          category: rowString(row, 'category'),
          sortOrder: rowNumber(row, 'sort_order'),
        };
      }),
      goals: (goals.data ?? []).map((value) => {
        const row = rowRecord(value);
        return {
          id: rowString(row, 'id'),
          label: rowString(row, 'label'),
          sortOrder: rowNumber(row, 'sort_order'),
        };
      }),
      muscleGroups: (muscleGroups.data ?? []).map((value) => {
        const row = rowRecord(value);
        return {
          id: rowString(row, 'id'),
          label: rowString(row, 'label'),
          sortOrder: rowNumber(row, 'sort_order'),
        };
      }),
    };
  }

  async listExercises(filters: ExerciseListFilters): Promise<ExercisePage> {
    const result = await this.client
      .from('exercises')
      .select(
        'id,slug,name,summary,category,position,difficulty,default_prescription,content_version,exercise_tracking_profiles(exercise_id),exercise_body_demands(body_region_id),exercise_equipment_options(equipment_id)',
      )
      .eq('active', true)
      .order('slug', { ascending: true })
      .range(0, 999);
    if (result.error) {
      throw new ApiError({
        statusCode: 503,
        code: 'dependency_unavailable',
        title: 'Exercise catalog unavailable',
        detail: 'The catalog dependency could not be reached.',
      });
    }
    let rows = (result.data ?? []).map(rowRecord);
    const normalizedSearch = filters.search?.trim().toLowerCase();
    rows = rows.filter((row) => {
      if (normalizedSearch !== undefined && normalizedSearch.length > 0) {
        const haystack = `${rowString(row, 'name')} ${rowString(row, 'slug')}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      if (filters.category !== undefined && rowString(row, 'category') !== filters.category)
        return false;
      if (filters.position !== undefined && rowString(row, 'position') !== filters.position)
        return false;
      if (filters.difficulty !== undefined && rowNumber(row, 'difficulty') !== filters.difficulty)
        return false;
      if (
        filters.trackingSupported !== undefined &&
        rowArray(row, 'exercise_tracking_profiles').length > 0 !== filters.trackingSupported
      )
        return false;
      if (
        filters.bodyRegionId !== undefined &&
        !rowArray(row, 'exercise_body_demands').some(
          (demand) => demand.body_region_id === filters.bodyRegionId,
        )
      )
        return false;
      if (
        filters.equipmentId !== undefined &&
        !rowArray(row, 'exercise_equipment_options').some(
          (option) => option.equipment_id === filters.equipmentId,
        )
      )
        return false;
      return true;
    });
    rows.sort((left, right) => {
      if (filters.sort === 'name' && rowString(left, 'name') !== rowString(right, 'name')) {
        return rowString(left, 'name').localeCompare(rowString(right, 'name'));
      }
      if (
        filters.sort === 'difficulty' &&
        rowNumber(left, 'difficulty') !== rowNumber(right, 'difficulty')
      ) {
        return rowNumber(left, 'difficulty') - rowNumber(right, 'difficulty');
      }
      return rowString(left, 'slug').localeCompare(rowString(right, 'slug'));
    });
    return paginateRows(rows, filters);
  }

  async getExercise(idOrSlug: string): Promise<ExerciseDetail | null> {
    const query = this.client
      .from('exercises')
      .select(
        'id,slug,name,summary,category,position,difficulty,default_prescription,instructions,safety_cues,adaptations,content_version,exercise_tracking_profiles(tracking_key,version),exercise_body_demands(body_region_id,involvement,demand),exercise_capability_demands(capability_id,demand,required),exercise_equipment_options(equipment_id,mode,or_group),exercise_muscles(muscle_group_id,role,intensity),exercise_source_links(exercise_sources(title,publisher,url,publication_year))',
      )
      .eq('active', true);
    // uuid vs slug: same public lookup the mobile client uses.
    const result = await (isUuid(idOrSlug)
      ? query.eq('id', idOrSlug)
      : query.eq('slug', idOrSlug)
    ).maybeSingle();
    if (result.error) {
      throw new ApiError({
        statusCode: 503,
        code: 'dependency_unavailable',
        title: 'Exercise catalog unavailable',
        detail: 'The catalog dependency could not be reached.',
      });
    }
    return result.data === null ? null : mapSupabaseDetail(rowRecord(result.data));
  }

  async getExerciseCandidate(idOrSlug: string): Promise<ExerciseCandidate | null> {
    const query = this.client
      .from('exercises')
      .select(
        'id,slug,name,category,position,difficulty,default_prescription,exercise_body_demands(region_id:body_region_id,involvement,demand),exercise_capability_demands(capability_id,demand,required),exercise_equipment_options(equipment_id,mode,or_group),exercise_goals(goal_id),exercise_tracking_profiles(tracking_key)',
      )
      .eq('active', true);
    const result = await (isUuid(idOrSlug)
      ? query.eq('id', idOrSlug)
      : query.eq('slug', idOrSlug)
    ).maybeSingle();
    if (result.error) {
      throw new ApiError({
        statusCode: 503,
        code: 'dependency_unavailable',
        title: 'Exercise catalog unavailable',
        detail: 'The catalog dependency could not be reached.',
      });
    }
    if (result.data === null) return null;
    const row = rowRecord(result.data);
    const prescription = rowRecord(row.default_prescription);
    const tracking = rowArray(row, 'exercise_tracking_profiles').at(0);
    const bodyDemands = rowArray(row, 'exercise_body_demands').map((demand) => ({
      regionId: rowString(demand, 'region_id'),
      involvement: rowString(
        demand,
        'involvement',
      ) as ExerciseCandidate['bodyDemands'][number]['involvement'],
      demand: rowString(demand, 'demand') as ExerciseCandidate['bodyDemands'][number]['demand'],
    }));
    const capabilityDemands = rowArray(row, 'exercise_capability_demands').map((demand) => ({
      capabilityId: rowString(demand, 'capability_id'),
      demand: rowString(
        demand,
        'demand',
      ) as ExerciseCandidate['capabilityDemands'][number]['demand'],
      required: demand.required === true,
    }));
    const equipmentOptions = rowArray(row, 'exercise_equipment_options').map((option) => ({
      equipmentId: rowString(option, 'equipment_id'),
      mode: rowString(option, 'mode') as ExerciseCandidate['equipmentOptions'][number]['mode'],
      ...(typeof option.or_group === 'string' ? { orGroup: option.or_group } : {}),
    }));
    const primaryRegionIds = bodyDemands
      .filter((demand) => demand.involvement === 'primary')
      .map((demand) => demand.regionId);
    const goals = rowArray(row, 'exercise_goals').map((goal) => rowString(goal, 'goal_id'));
    const base = {
      id: rowString(row, 'id'),
      slug: rowString(row, 'slug'),
      familyKey: rowString(row, 'slug'),
      name: rowString(row, 'name'),
      category: rowString(row, 'category') as ExerciseCandidate['category'],
      position: rowString(row, 'position') as ExerciseCandidate['position'],
      difficulty: rowNumber(row, 'difficulty') as ExerciseCandidate['difficulty'],
      active: true,
      defaultPrescription: {
        sets: rowNumber(prescription, 'sets', 1),
        restSeconds: rowNumber(prescription, 'restSeconds', 45),
        ...(typeof prescription.reps === 'number' ? { reps: prescription.reps } : {}),
        ...(typeof prescription.holdSeconds === 'number'
          ? { holdSeconds: prescription.holdSeconds }
          : {}),
      },
      estimatedSecondsPerSet: 45,
      bodyDemands,
      capabilityDemands,
      equipmentOptions,
      primaryRegionIds,
      goalIds: goals,
    } satisfies Omit<ExerciseCandidate, 'trackingProfileKey'>;
    return tracking === undefined || typeof tracking.tracking_key !== 'string'
      ? base
      : { ...base, trackingProfileKey: tracking.tracking_key };
  }
}

const paginateRows = (rows: readonly Row[], filters: ExerciseListFilters): ExercisePage => {
  let filteredRows = rows;
  if (filters.cursor !== undefined) {
    const cursorSlug = decodeCursor(filters.cursor);
    const cursorIndex = rows.findIndex((row) => rowString(row, 'slug') === cursorSlug);
    if (cursorIndex === -1) {
      throw new ApiError({
        statusCode: 400,
        code: 'invalid_cursor',
        title: 'Invalid cursor',
        detail: 'The pagination cursor does not belong to this collection.',
      });
    }
    filteredRows = rows.slice(cursorIndex + 1);
  }
  const pageRows = filteredRows.slice(0, filters.limit);
  const hasMore = filteredRows.length > pageRows.length;
  return {
    data: pageRows.map(mapSupabaseSummary),
    page: {
      hasMore,
      nextCursor: hasMore ? encodeCursor(rowString(pageRows.at(-1) ?? {}, 'slug')) : null,
    },
  };
};
