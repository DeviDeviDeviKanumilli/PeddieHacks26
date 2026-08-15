import type {
  CreateWorkoutSessionRequest,
  ErrorResponse,
  ExerciseAnalysis,
  ExerciseDetail,
  ExerciseSession,
  ExerciseSummary,
  GenerateWorkoutRequest,
  GenerateWorkoutResponse,
  MetricBatchRequest,
  MetricBatchResponse,
  MovementProfile,
  PatchExerciseSessionRequest,
  ProgressSummary,
  Settings,
  SettingsPatch,
  UpdateMovementProfileRequest,
  WorkoutSession,
} from '@peddie/contracts';
import { mobileConfig } from '@/lib/config';
import { getSupabaseClient } from '@/lib/supabase';

type DataEnvelope<T> = { data: T };
type ExercisePage = {
  data: ExerciseSummary[];
  page: { nextCursor: string | null; hasMore: boolean };
};
export type ProgressActivity = {
  activityDate: string;
  sessionCount: number;
  exerciseCount: number;
  setCount: number;
  repCount: number;
  activeSeconds: number;
  averageScore: number | null;
};

export class MobileApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message);
    this.name = 'MobileApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

const bearerToken = async (): Promise<string | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  if (!mobileConfig.apiBaseUrl) {
    throw new MobileApiError(
      'The backend is not configured on this device.',
      0,
      'api_unconfigured',
    );
  }

  const token = await bearerToken();
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${mobileConfig.apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    throw new MobileApiError(
      'AdaptFit could not reach the backend. Your on-device experience is still available.',
      0,
      'network_unavailable',
    );
  }

  if (!response.ok) {
    const fallback: ErrorResponse = {
      type: 'about:blank',
      title: 'Request failed',
      status: response.status,
      code: 'request_failed',
      detail: 'The backend could not complete this request.',
      requestId: response.headers.get('x-request-id') ?? 'unknown',
    };
    const problem = (await response.json().catch(() => fallback)) as ErrorResponse;
    throw new MobileApiError(problem.detail, response.status, problem.code, problem.requestId);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

const jsonBody = (value: unknown): RequestInit => ({
  body: JSON.stringify(value),
  method: 'POST',
});

export const mobileApi = {
  getExercise: async (idOrSlug: string): Promise<ExerciseDetail> => {
    const response = await request<DataEnvelope<ExerciseDetail>>(
      `/v1/exercises/${encodeURIComponent(idOrSlug)}`,
    );
    return response.data;
  },
  listExercises: async (search?: string): Promise<ExercisePage> => {
    const query = new URLSearchParams({ limit: '100', sort: 'name' });
    if (search?.trim()) query.set('search', search.trim());
    return request<ExercisePage>(`/v1/exercises?${query.toString()}`);
  },
  getMovementProfile: async (): Promise<MovementProfile> => {
    const response = await request<DataEnvelope<MovementProfile>>('/v1/movement-profile');
    return response.data;
  },
  putMovementProfile: async (profile: UpdateMovementProfileRequest): Promise<MovementProfile> => {
    const response = await request<DataEnvelope<MovementProfile>>('/v1/movement-profile', {
      ...jsonBody(profile),
      method: 'PUT',
    });
    return response.data;
  },
  patchSettings: async (settings: SettingsPatch): Promise<Settings> => {
    const response = await request<DataEnvelope<Settings>>('/v1/settings', {
      ...jsonBody(settings),
      method: 'PATCH',
    });
    return response.data;
  },
  generateWorkout: async (
    input: GenerateWorkoutRequest,
  ): Promise<GenerateWorkoutResponse['data']> => {
    const response = await request<GenerateWorkoutResponse>(
      '/v1/workouts/generate',
      jsonBody(input),
    );
    return response.data;
  },
  getProgressSummary: async (): Promise<ProgressSummary> => {
    const response = await request<DataEnvelope<ProgressSummary>>('/v1/progress/summary');
    return response.data;
  },
  getProgressActivity: async (): Promise<ProgressActivity[]> => {
    const response = await request<{ data: ProgressActivity[] }>('/v1/progress/activity?limit=31');
    return response.data;
  },
  deleteAccount: async (): Promise<void> => request<void>('/v1/users/me', { method: 'DELETE' }),
  createWorkoutSession: async (input: CreateWorkoutSessionRequest): Promise<WorkoutSession> => {
    const response = await request<DataEnvelope<WorkoutSession>>(
      '/v1/workout-sessions',
      jsonBody(input),
    );
    return response.data;
  },
  listExerciseSessions: async (workoutSessionId: string): Promise<ExerciseSession[]> => {
    const response = await request<{ data: ExerciseSession[] }>(
      `/v1/workout-sessions/${encodeURIComponent(workoutSessionId)}/exercise-sessions`,
    );
    return response.data;
  },
  patchExerciseSession: async (
    exerciseSessionId: string,
    input: PatchExerciseSessionRequest,
  ): Promise<ExerciseSession> => {
    const response = await request<DataEnvelope<ExerciseSession>>(
      `/v1/exercise-sessions/${encodeURIComponent(exerciseSessionId)}`,
      { ...jsonBody(input), method: 'PATCH' },
    );
    return response.data;
  },
  ingestMetrics: async (
    exerciseSessionId: string,
    input: MetricBatchRequest,
  ): Promise<MetricBatchResponse['data']> => {
    const response = await request<MetricBatchResponse>(
      `/v1/exercise-sessions/${encodeURIComponent(exerciseSessionId)}/metrics`,
      jsonBody(input),
    );
    return response.data;
  },
  completeExerciseSession: async (
    exerciseSessionId: string,
    expectedVersion: number,
  ): Promise<ExerciseAnalysis> => {
    const response = await request<DataEnvelope<ExerciseAnalysis>>(
      `/v1/exercise-sessions/${encodeURIComponent(exerciseSessionId)}/complete`,
      jsonBody({ expectedVersion }),
    );
    return response.data;
  },
  completeWorkoutSession: async (
    workoutSessionId: string,
    expectedVersion: number,
  ): Promise<WorkoutSession> => {
    const response = await request<DataEnvelope<WorkoutSession>>(
      `/v1/workout-sessions/${encodeURIComponent(workoutSessionId)}/complete`,
      jsonBody({ expectedVersion, endReason: 'completed_in_mobile_app' }),
    );
    return response.data;
  },
  getExerciseAnalysis: async (exerciseSessionId: string): Promise<ExerciseAnalysis> => {
    const response = await request<DataEnvelope<ExerciseAnalysis>>(
      `/v1/exercise-sessions/${encodeURIComponent(exerciseSessionId)}/analysis`,
    );
    return response.data;
  },
};
