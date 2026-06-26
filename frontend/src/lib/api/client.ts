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
        const newAccessToken = await useAuthStore.getState().refreshAccessToken();

        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          // If Supabase returns null, the session is completely dead. 
          // Trigger the logout and redirect.
          useAuthStore.getState().clearAuth();
          processQueue(new Error("Session expired"), null);
        }
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        processQueue(refreshError, null);
      } finally {
        isRefreshing = false;
      }
    }

    // 2. Your standard API Error formatting and 403 handling
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