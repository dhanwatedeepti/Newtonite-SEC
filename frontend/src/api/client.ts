import { ApiError } from '../types';

let inMemoryCsrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  inMemoryCsrfToken = token;
};

export const getCsrfToken = (): string | null => {
  return inMemoryCsrfToken;
};

export class ApiResponseError extends Error {
  status: number;
  data: ApiError;

  constructor(status: number, data: ApiError) {
    super(data.message || (typeof data.detail === 'string' ? data.detail : 'API request failed'));
    this.name = 'ApiResponseError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/api/v1/${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  // Include in-memory CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    if (inMemoryCsrfToken) {
      headers.set('X-CSRF-Token', inMemoryCsrfToken);
    }
  }

  // Include idempotency key if specified
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends and receives HttpOnly cookies
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  let data: any = {};
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    throw new ApiResponseError(response.status, data);
  }

  return data as T;
}
