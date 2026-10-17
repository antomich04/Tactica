import axios from "axios";
import { Session, Ticket } from "../types";

export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const TICKET_MARGIN_MS = 20_000;

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

type Options = {
  token?: string;
  cookieAuth?: boolean;
};

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(
  method: HttpMethod,
  path: string,
  data?: unknown,
  options: Options = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.cookieAuth) headers["X-Requested-With"] = "tactica";

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
        throw new ApiError(0, "Can't reach the server. Is the backend running?");
      }
      const detail = error.response.data?.detail;
      let message = `Request failed (${error.response.status})`;

      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0 && detail[0]?.msg) {
        // Pydantic returns field errors as a list; surface the first message.
        message = String(detail[0].msg).replace(/^Value error,\s*/i, "");
      }

      throw new ApiError(error.response.status, message);
    }
    throw error;
  }
}

let accessToken: string | null = null;
let expiresAt = 0; // Access-token expiry as a Unix timestamp in milliseconds.
let inflight: Promise<Session> | null = null;
let epoch = 0; // Sign-out increments this to invalidate any refresh already in flight.

export const hasSession = () => accessToken !== null;
export const msUntilExpiry = () => expiresAt - Date.now();
export const sessionEpoch = () => epoch;

function apply(s: Session): Session {
  accessToken = s.access_token;
  expiresAt = Date.now() + s.expires_in * 1000;
  return s;
}

export function clearSession(): void {
  accessToken = null;
  expiresAt = 0;
  epoch += 1;
}

export async function login(usernameOrEmail: string, password: string): Promise<Session> {
  return apply(
    await request<Session>("POST", "/api/auth/login", {
      username_or_email: usernameOrEmail,
      password,
    })
  );
}

export async function register(
  username: string,
  email: string,
  password: string,
  preferences?: { favorite_team?: string | null; language?: string; persona?: string }
): Promise<Session> {
  return apply(
    await request<Session>("POST", "/api/auth/register", {
      username,
      email,
      password,
      ...(preferences ? { preferences } : {}),
    })
  );
}

const oneTabAtATime = <T>(fn: () => Promise<T>): Promise<T> =>
  navigator.locks ? navigator.locks.request("tactica-refresh", fn) : fn();

export function refreshSession(): Promise<Session> {
  inflight ??= (async () => {
    const startedAt = epoch;

    try {
      const s = await oneTabAtATime(() =>
        request<Session>("POST", "/api/auth/refresh", undefined, { cookieAuth: true })
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
    await request<void>("POST", "/api/auth/logout", undefined, { cookieAuth: true });
  } finally {
    clearSession();
  }
}

async function validToken(): Promise<string> {
  if (accessToken === null || msUntilExpiry() < TICKET_MARGIN_MS) await refreshSession();
  return accessToken as string;
}

export async function fetchWsTicket(): Promise<string> {
  try {
    return (
      await request<Ticket>("POST", "/api/auth/ws-ticket", undefined, {
        token: await validToken(),
      })
    ).ticket;
  } catch (e) {
    if (!isUnauthorized(e)) throw e;
    await refreshSession();
    return (
      await request<Ticket>("POST", "/api/auth/ws-ticket", undefined, {
        token: accessToken as string,
      })
    ).ticket;
  }
}