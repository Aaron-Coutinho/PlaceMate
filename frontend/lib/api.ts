/**
 * PlaceMate – API Client
 *
 * Centralized HTTP client for communicating with the FastAPI backend.
 * Automatically attaches the Firebase ID token to all requests.
 */

import { getIdToken } from "./firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
}

/** Extends Error with structured backend detail for rate-limit handling. */
export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Make an authenticated API request to the backend.
 *
 * @param endpoint - API path (e.g., "/test/questions")
 * @param options  - HTTP method, body, extra headers
 * @returns Parsed JSON response
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const token = await getIdToken();
  if (!token) {
    throw new Error("User is not authenticated. Please sign in first.");
  }

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const detail = await response.json().catch(() => response.statusText);
    const detailObj = typeof detail === "object" && detail !== null ? (detail as Record<string, any>) : {};
    const message =
      detailObj.message ||
      detailObj.detail ||
      (typeof detail === "string" ? detail : `API error: ${response.status}`);
    throw new ApiError(message, response.status, detail);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

export const api = {
  get: <T = unknown>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "GET" }),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "POST", body }),

  put: <T = unknown>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "PUT", body }),

  delete: <T = unknown>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),
};
