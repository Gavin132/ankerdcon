import axios from "axios";
import { useAuthStore } from "../store/auth.store";

export const apiClient = axios.create({
  // Since Vite runs on 5173, make sure this points to your FastAPI server port
  baseURL: "http://localhost:8000", 
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 403) {
      useAuthStore.getState().setForbidden();
    }
    return Promise.reject(error);
  },
);