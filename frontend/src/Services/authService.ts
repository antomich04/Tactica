import axios from "axios";
import { Session, Ticket, UserPreferences } from "../types";

export const API_URL = "";
const TICKET_MARGIN_MS = 20_000;
const DEFAULT_ACCESS_TTL_MS = 900 * 1000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const isUnauthorized = (e: unknown) =>
  e instanceof ApiError && e.status === 401;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Always send & receive HttpOnly cookies
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

type Options = {
  cookieAuth?: boolean;
  headers?: Record<string, string>;
};

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function request<T>(
  method: HttpMethod,
  path: string,
  data?: unknown,
  options: Options = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "X-Requested-With": "tactica",
    ...options.headers,
  };

  try {
    const response = await api({
      method,
      url: path,
      data,
      headers,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new ApiError(
          0,
          "Can't reach the server. Is the backend running?",
        );
      }
      const detail = error.response.data?.detail;
      let message = `Request failed (${error.response.status})`;

      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0 && detail[0]?.msg) {
        message = String(detail[0].msg).replace(/^Value error,\s*/i, "");
      }

      throw new ApiError(error.response.status, message);
    }
    throw error;
  }
}

let authenticated = false;
let expiresAt = 0; // Access-cookie expiry as a Unix timestamp in milliseconds.
let inflight: Promise<Session> | null = null;
let epoch = 0; // Sign-out increments this to invalidate any refresh already in flight.

export const hasSession = () => authenticated && expiresAt > 0;
export const msUntilExpiry = () => expiresAt - Date.now();
export const sessionEpoch = () => epoch;

/** Call when an account route (e.g. /preferences, /change-username) rotates cookies. */
export function markSessionRotated(ttlSeconds = 900): void {
  authenticated = true;
  expiresAt = Date.now() + ttlSeconds * 1000;
}

function apply(s: Session): Session {
  authenticated = true;
  expiresAt = Date.now() + (s.expires_in * 1000 || DEFAULT_ACCESS_TTL_MS);
  return s;
}

export function clearSession(): void {
  authenticated = false;
  expiresAt = 0;
  epoch += 1;
}

export async function login(
  usernameOrEmail: string,
  password: string,
): Promise<Session> {
  return apply(
    await request<Session>("POST", "/api/auth/login", {
      username_or_email: usernameOrEmail,
      password,
    }),
  );
}

export async function register(
  username: string,
  email: string,
  password: string,
  preferences?: Partial<UserPreferences>,
): Promise<Session> {
  return apply(
    await request<Session>("POST", "/api/auth/register", {
      username,
      email,
      password,
      ...(preferences ? { preferences } : {}),
    }),
  );
}

const oneTabAtATime = <T>(fn: () => Promise<T>): Promise<T> =>
  navigator.locks ? navigator.locks.request("tactica-refresh", fn) : fn();

export function refreshSession(): Promise<Session> {
  inflight ??= (async () => {
    const startedAt = epoch;

    try {
      const s = await oneTabAtATime(() =>
        request<Session>("POST", "/api/auth/refresh", undefined, {
          cookieAuth: true,
        }),
      );
      if (epoch !== startedAt) throw new ApiError(401, "Signed out");
      return apply(s);
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function logout(): Promise<void> {
  try {
    await request<void>("POST", "/api/auth/logout", undefined, {
      cookieAuth: true,
    });
  } finally {
    clearSession();
  }
}

export async function fetchWsTicket(): Promise<string> {
  if (!hasSession() || msUntilExpiry() < TICKET_MARGIN_MS) {
    await refreshSession();
  }
  try {
    return (await request<Ticket>("POST", "/api/auth/ws-ticket")).ticket;
  } catch (e) {
    if (!isUnauthorized(e)) throw e;
    await refreshSession();
    return (await request<Ticket>("POST", "/api/auth/ws-ticket")).ticket;
  }
}
