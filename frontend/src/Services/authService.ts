import axios from "axios";
import { Session, Ticket } from "../types";

export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const TICKET_MARGIN_MS = 20_000; // refresh first if the token has less life than this left

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

async function request<T>(method: "GET" | "POST", path: string, data?: unknown, options: Options = {}): Promise<T> {
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
      throw new ApiError(
        error.response.status,
        typeof detail === "string" ? detail : `Request failed (${error.response.status})`
      );
    }
    throw error;
  }
}

let accessToken: string | null = null;
let expiresAt = 0; // Expiry time in milliseconds since the Unix epoch.
let inflight: Promise<Session> | null = null;
let epoch = 0; // Incremented on sign-out so pending refreshes cannot restore the session.

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

export async function login(username: string, email: string, password: string): Promise<Session> {
  return apply(await request<Session>("POST", "/api/auth/login", { username, email, password }));
}

export async function register(username: string, email: string, password: string): Promise<Session> {
  return apply(await request<Session>("POST", "/api/auth/register", {
    username,
    email,
    password,
  }));
}

const oneTabAtATime = <T>(fn: () => Promise<T>): Promise<T> =>
  navigator.locks ? navigator.locks.request("tactica-refresh", fn) : fn();

export function refreshSession(): Promise<Session> {
  inflight ??= (async () => {
    const startedAt = epoch;

    try {
      const s = await oneTabAtATime(() => request<Session>("POST", "/api/auth/refresh", undefined, { cookieAuth: true }));
      if (epoch !== startedAt) throw new ApiError(401, "Signed out"); // Sign-out happened while refresh was pending.
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
    return (await request<Ticket>("POST", "/api/auth/ws-ticket", undefined, { token: await validToken() })).ticket;
  } catch (e) {
    if (!isUnauthorized(e)) throw e;
    await refreshSession();
    return (await request<Ticket>("POST", "/api/auth/ws-ticket", undefined, { token: accessToken as string })).ticket;
  }
}