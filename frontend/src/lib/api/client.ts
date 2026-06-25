import axios from "axios";
import { env } from "../../config/env";
import { useAuthStore } from "../../store/auth.store";

// ── Typed error class ──────────────────────────────────────────────

/**
 * All non-2xx responses from the backend are thrown as ApiError.
 * The message is taken from the backend `detail` / `message` field —
 * never exposed raw to the user; pass it through getErrorMessage() first.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
}

// ── HTTP client ────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0;
      const message =
        error.response?.data?.detail ??
        error.response?.data?.message ??
        error.message;

      if (status === 403) {
        useAuthStore.getState().setForbidden();
      }

      return Promise.reject(new ApiError(status, String(message)));
    }
    return Promise.reject(error);
  },
);
