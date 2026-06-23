import axios from "axios";
import { useAuthStore } from "../store/auth.store";

export const apiClient = axios.create({
  // Since Vite runs on 5173, make sure this points to your FastAPI server port
  baseURL: "http://localhost:8000", 
});

// The new Interceptor: Attaches the token, but NEVER tries to refresh on 401s
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});