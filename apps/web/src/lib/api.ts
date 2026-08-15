export type ProblemDetail = {
  code: string;
  detail: string;
  requestId?: string;
  errors?: Array<{ code: string; message: string }>;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly problem?: ProblemDetail;

  constructor(message: string, status: number, problem?: ProblemDetail) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.problem = problem;
  }
}

const configuredBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const apiBaseUrl = (
  configuredBaseUrl === undefined || configuredBaseUrl.length === 0 ? '/api' : configuredBaseUrl
).replace(/\/$/, '');

export class ApiClient {
  constructor(private readonly getAccessToken: () => Promise<string | null>) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    if (init.body !== undefined) {
      headers.set('content-type', 'application/json');
    }
    if (token !== null) {
      headers.set('authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const problem = (await response.json().catch(() => undefined)) as ProblemDetail | undefined;
      throw new ApiClientError(
        problem?.detail ?? 'The request could not be completed.',
        response.status,
        problem,
      );
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

/**
 * Every endpoint below exists in apps/api. Responses come back wrapped as `{ data }`,
 * so each method unwraps before returning to keep call sites free of the envelope.
 */
type Envelope<T> = { data: T };

const unwrap = <T>(response: Envelope<T>): T => response.data;

export type GenerateWorkoutRequest = {
  muscleGroups: string[];
  movementPatterns: string[];
  equipmentIds: string[];
  difficulty: string;
};

export class AdaptFitApi {
  constructor(private readonly client: ApiClient) {}

  async referenceData<T>(): Promise<T> {
    return unwrap(await this.client.get<Envelope<T>>('/v1/reference-data'));
  }

  async movementProfile<T>(): Promise<T> {
    return unwrap(await this.client.get<Envelope<T>>('/v1/movement-profile'));
  }

  async saveMovementProfile<T>(update: unknown): Promise<T> {
    return unwrap(await this.client.put<Envelope<T>>('/v1/movement-profile', update));
  }

  async settings<T>(): Promise<T> {
    return unwrap(await this.client.get<Envelope<T>>('/v1/settings'));
  }

  async saveSettings<T>(patch: unknown): Promise<T> {
    return unwrap(await this.client.patch<Envelope<T>>('/v1/settings', patch));
  }

  async userProfile<T>(): Promise<T> {
    return unwrap(await this.client.get<Envelope<T>>('/v1/users/me'));
  }

  async saveUserProfile<T>(patch: unknown): Promise<T> {
    return unwrap(await this.client.patch<Envelope<T>>('/v1/users/me', patch));
  }

  async generateWorkout<T>(request: GenerateWorkoutRequest): Promise<T> {
    return unwrap(await this.client.post<Envelope<T>>('/v1/workouts/generate', request));
  }

  async workouts<T>(): Promise<T> {
    return unwrap(await this.client.get<Envelope<T>>('/v1/workouts'));
  }

  async workout<T>(workoutId: string): Promise<T> {
    return unwrap(
      await this.client.get<Envelope<T>>(`/v1/workouts/${encodeURIComponent(workoutId)}`),
    );
  }

  async saveWorkout<T>(workout: unknown): Promise<T> {
    return unwrap(await this.client.post<Envelope<T>>('/v1/workouts', workout));
  }

  /** Backs the Swap Exercise screen: the alternatives the API considers valid for this slot. */
  async itemAlternatives<T>(workoutId: string, itemId: string): Promise<T> {
    return unwrap(
      await this.client.get<Envelope<T>>(
        `/v1/workouts/${encodeURIComponent(workoutId)}/items/${encodeURIComponent(itemId)}/alternatives`,
      ),
    );
  }

  async swapWorkoutItem<T>(workoutId: string, itemId: string, body: unknown): Promise<T> {
    return unwrap(
      await this.client.patch<Envelope<T>>(
        `/v1/workouts/${encodeURIComponent(workoutId)}/items/${encodeURIComponent(itemId)}`,
        body,
      ),
    );
  }

  async progressSummary<T>(): Promise<T> {
    return unwrap(await this.client.get<Envelope<T>>('/v1/progress/summary'));
  }

  async progressActivity<T>(): Promise<T> {
    return unwrap(await this.client.get<Envelope<T>>('/v1/progress/activity'));
  }

  async completeWorkoutSession<T>(sessionId: string, body: unknown): Promise<T> {
    return unwrap(
      await this.client.post<Envelope<T>>(
        `/v1/workout-sessions/${encodeURIComponent(sessionId)}/complete`,
        body,
      ),
    );
  }
}
