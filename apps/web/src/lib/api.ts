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
}
