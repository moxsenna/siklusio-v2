import Constants from "expo-constants";
import { supabase } from "./supabase";
import { resolveApiBaseUrl } from "./apiBaseUrl";
import { getSupabaseAccessToken } from "./supabaseAccess";

export class ApiError extends Error {
  status: number;
  code?: string;
  payload: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl({
    configured: process.env.EXPO_PUBLIC_API_BASE_URL,
    debuggerHost: Constants.expoConfig?.hostUri || "",
    isDevelopment: typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production",
  });
}

export async function getAccessToken(): Promise<string | null> {
  return getSupabaseAccessToken(supabase);
}

export async function apiPostJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      json?.message || json?.error || `Server error (${res.status})`,
      res.status,
      json?.code,
      json,
    );
  }
  return json as TResponse;
}

export async function apiGetJson<TResponse>(path: string): Promise<TResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      json?.message || json?.error || `Server error (${res.status})`,
      res.status,
      json?.code,
      json,
    );
  }
  return json as TResponse;
}

export async function apiPatchJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      json?.message || json?.error || `Server error (${res.status})`,
      res.status,
      json?.code,
      json,
    );
  }
  return json as TResponse;
}

export async function apiDeleteJson<TResponse>(path: string): Promise<TResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      json?.message || json?.error || `Server error (${res.status})`,
      res.status,
      json?.code,
      json,
    );
  }
  return json as TResponse;
}
