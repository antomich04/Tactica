import { Session, Ticket } from "../types";

export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/** No API address means no backend: the app is an offline demo on the built-in fixture, with no login. */
export const AUTH_ENABLED = API_URL !== "";

const TICKET_MARGIN_MS = 20_000; // refresh first if the token has less life than this left

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** 401 means "not signed in" or "session over". Status 0 means the server could not be reached. */
export const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

type Options = {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string;
  cookieAuth?: boolean;
};

async function request<T>(path: string, { method = "GET", body, token, cookieAuth }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookieAuth) headers["X-Requested-With"] = "tactica";

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include", // lets the browser send and store the refresh cookie
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the backend running?");
  }

  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new ApiError(res.status, typeof detail === "string" ? detail : `Request failed (${res.status})`);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

let accessToken: string | null = null;
let expiresAt = 0; // ms since epoch
let inflight: Promise<Session> | null = null;
let epoch = 0; // bumps on every sign-out: a refresh that finishes after a sign-out is discarded

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

export async function login(username: string, password: string): Promise<Session> {
  return apply(await request<Session>("/api/auth/login", { method: "POST", body: { username, password } }));
}

const oneTabAtATime = <T>(fn: () => Promise<T>): Promise<T> =>
  navigator.locks ? navigator.locks.request("tactica-refresh", fn) : fn();

/** Trade the refresh cookie for a new access token. Calls made at the same moment share one request. */
export function refreshSession(): Promise<Session> {
  inflight ??= (async () => {
    const startedAt = epoch;

    try {
      const s = await oneTabAtATime(() => request<Session>("/api/auth/refresh", { method: "POST", cookieAuth: true }));
      if (epoch !== startedAt) throw new ApiError(401, "Signed out"); // signed out while we waited
      return apply(s);
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function logout(): Promise<void> {
  try {
    await request<void>("/api/auth/logout", { method: "POST", cookieAuth: true });
  } finally {
    clearSession(); // sign out locally even if the server could not be reached
  }
}

async function validToken(): Promise<string> {
  if (accessToken === null || msUntilExpiry() < TICKET_MARGIN_MS) await refreshSession();
  return accessToken as string;
}

/** A short-lived, 30-second ticket for opening the WebSocket (browsers cannot send headers on a WebSocket). */
export async function fetchWsTicket(): Promise<string> {
  try {
    return (await request<Ticket>("/api/auth/ws-ticket", { method: "POST", token: await validToken() })).ticket;
  } catch (e) {
    if (!isUnauthorized(e)) throw e;
    await refreshSession(); // the token was refused (revoked?): try once with a fresh one
    return (await request<Ticket>("/api/auth/ws-ticket", { method: "POST", token: accessToken as string })).ticket;
  }
}
