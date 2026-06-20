import axios from "axios";
import type { LoginRequest, TokenResponse } from "../types";

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const { data } = await axios.post<TokenResponse>("/api/auth/login", payload, {
    withCredentials: true,
  });
  return data;
}

export async function logout(): Promise<void> {
  await axios.post("/api/auth/logout", {}, { withCredentials: true });
}

export async function refresh(): Promise<TokenResponse> {
  const { data } = await axios.post<TokenResponse>(
    "/api/auth/refresh",
    {},
    { withCredentials: true },
  );
  return data;
}
