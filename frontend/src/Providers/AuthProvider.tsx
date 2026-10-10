import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as auth from "../Services/authService";
import { AuthStatus, Session, User } from "../types";

// Access tokens last five minutes and are renewed 30 seconds before expiry.
const RENEW_BEFORE_EXPIRY_MS = 30_000;
const RETRY_MS = 10_000;

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  notice: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getWsTicket: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const renewRef = useRef<() => Promise<void>>(async () => {});

  const schedule = useCallback((ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void renewRef.current(), Math.max(0, ms));
  }, []);

  const signedIn = useCallback((s: Session) => {
    setUser(s.user);
    setStatus("authenticated");
    setNotice("");
    schedule(s.expires_in * 1000 - RENEW_BEFORE_EXPIRY_MS);
  }, [schedule]);

  const signedOut = useCallback((message = "") => {
    window.clearTimeout(timer.current);
    auth.clearSession();
    setUser(null);
    setStatus("anonymous");
    setNotice(message);
  }, []);

  const renew = useCallback(async (firstLoad = false) => {
    const started = auth.sessionEpoch();

    try {
      const s = await auth.refreshSession();
      if (started === auth.sessionEpoch()) signedIn(s);
    } catch (e) {
      if (started !== auth.sessionEpoch()) return; // Ignore a refresh failure if sign-out happened while it was pending.

      if (auth.isUnauthorized(e)) signedOut(firstLoad ? "" : "Your session expired. Please sign in again.");
      else if (firstLoad) signedOut(e instanceof Error ? e.message : "Can't reach the server.");
      else schedule(RETRY_MS); // Retry network failures instead of signing the user out.
    }
  }, [signedIn, signedOut, schedule]);

  useEffect(() => {
    renewRef.current = () => renew();
  }, [renew]);

  // Restore the session from the HttpOnly cookie when the page loads.
  useEffect(() => {
    void renew(true);
    return () => window.clearTimeout(timer.current);
  }, [renew]);

  // Renew immediately if a sleeping tab wakes after its token is nearly expired.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && auth.hasSession() && auth.msUntilExpiry() < RENEW_BEFORE_EXPIRY_MS) {
        void renewRef.current();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    signedIn(await auth.login(username, password)); // Login errors propagate to the form.
  }, [signedIn]);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
      signedOut();
    } catch (e) {
      signedOut(
        `Signed out locally, but the server could not revoke the session: ${
          e instanceof Error ? e.message : "Unknown error"
        }`,
      );
    }
  }, [signedOut]);

  const getWsTicket = useCallback(async () => {
    try {
      return await auth.fetchWsTicket();
    } catch (e) {
      if (auth.isUnauthorized(e)) signedOut("Your session expired. Please sign in again.");
      throw e;
    }
  }, [signedOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, notice, login, logout, getWsTicket }),
    [status, user, notice, login, logout, getWsTicket],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
