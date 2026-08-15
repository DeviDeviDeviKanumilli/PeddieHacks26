import type { ErrorResponse, ExerciseDetail, ExerciseSummary } from '@peddie/contracts';
import { mobileConfig } from '@/lib/config';
import { getSupabaseClient } from '@/lib/supabase';

type DataEnvelope<T> = { data: T };
type ExercisePage = {
  data: ExerciseSummary[];
  page: { nextCursor?: string; limit: number };
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

  return (await response.json()) as T;
};

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
};
