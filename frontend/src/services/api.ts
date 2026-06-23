import axios from "axios";
import { useAuthStore } from "../store/auth.store";

// Create a custom Axios instance
export const api = axios.create({
  // Point this to your backend URL. 
  // You can swap this for import.meta.env.VITE_API_URL later for production!
  baseURL: "http://localhost:8000", 
});

// The Interceptor: This runs automatically before EVERY request
api.interceptors.request.use((config) => {
  // Reach into your Zustand store and grab the token
  const token = useAuthStore.getState().accessToken;
  
  // If the user is logged in, attach the token to the header securely
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});