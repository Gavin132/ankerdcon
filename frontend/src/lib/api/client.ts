import axios from "axios";
import { env } from "../../config/env";
import { useAuthStore } from "../../store/auth.store";

// ── Typed error class ──────────────────────────────────────────────

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

// ── Token Refresh Variables ────────────────────────────────────────

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ── Response Interceptor ───────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. Intercept 401 Unauthorized for silent token refresh
    if (axios.isAxiosError(error) && error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const outcome = await useAuthStore.getState().refreshAccessToken();

        if ("token" in outcome) {
          originalRequest.headers.Authorization = `Bearer ${outcome.token}`;
          processQueue(null, outcome.token);
          return apiClient(originalRequest);
        }
        // `dead` already signed the user out inside the store. `retry` means we
        // simply couldn't reach the auth server — the session stands, so this
        // one request fails and the next attempt (a refetch, or the user
        // pulling the screen again) picks up where it left off. Signing out
        // here is what used to boot people off the app on bad reception.
        processQueue(new Error("retry" in outcome ? "Kon niet vernieuwen" : "Session expired"), null);
      } catch (refreshError) {
        processQueue(refreshError, null);
      } finally {
        isRefreshing = false;
      }
    }

    // 2. On 403, retry once after a short delay before treating as forbidden.
    //    Guards against transient backend/DB blips that briefly fail the allowlist check.
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 403 &&
      !originalRequest._retry403 &&
      useAuthStore.getState().isAuthenticated
    ) {
      originalRequest._retry403 = true;
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      try {
        return await apiClient(originalRequest);
      } catch {
        // falls through to standard error handling below
      }
    }

    // 3. Your standard API Error formatting and 403 handling
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0;
      const message =
        error.response?.data?.detail ??
        error.response?.data?.message ??
        error.message;

      if (status === 403 && useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().setForbidden();
      }

      return Promise.reject(new ApiError(status, String(message)));
    }

    return Promise.reject(error);
  }
);