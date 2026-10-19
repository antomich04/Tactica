import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as auth from "../Services/authService";
import { AuthStatus, Session, User, UserPreferences } from "../types";

// Schedule refresh 30 seconds before the access token's reported expiry.
const RENEW_BEFORE_EXPIRY_MS = 30_000;
const RETRY_MS = 10_000;

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  notice: string;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    preferences?: Partial<UserPreferences>,
  ) => Promise<void>;
  logout: () => Promise<void>;
  getWsTicket: () => Promise<string>;
  refreshUser: () => Promise<void>;
  patchUser: (updates: Partial<User>) => void;
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
    timer.current = window.setTimeout(
      () => void renewRef.current(),
      Math.max(0, ms),
    );
  }, []);

  const signedIn = useCallback(
    (s: Session) => {
      setUser(s.user);
      setStatus("authenticated");
      setNotice("");
      schedule(s.expires_in * 1000 - RENEW_BEFORE_EXPIRY_MS);
    },
    [schedule],
  );

  const signedOut = useCallback((message = "") => {
    window.clearTimeout(timer.current);
    auth.clearSession();
    setUser(null);
    setStatus("anonymous");
    setNotice(message);
  }, []);

  const renew = useCallback(
    async (firstLoad = false) => {
      const started = auth.sessionEpoch();

      try {
        const s = await auth.refreshSession();
        if (started === auth.sessionEpoch()) signedIn(s);
      } catch (e) {
        if (started !== auth.sessionEpoch()) return;

        if (auth.isUnauthorized(e))
          signedOut(
            firstLoad ? "" : "Your session expired. Please sign in again.",
          );
        else if (firstLoad)
          signedOut(e instanceof Error ? e.message : "Can't reach the server.");
        else schedule(RETRY_MS);
      }
    },
    [signedIn, signedOut, schedule],
  );

  useEffect(() => {
    renewRef.current = () => renew();
  }, [renew]);

  // Restore the session from its HttpOnly cookie when the app starts.
  useEffect(() => {
    void renew(true);
    return () => window.clearTimeout(timer.current);
  }, [renew]);

  // A suspended tab may miss its timer, so check expiry again when it becomes visible.
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        auth.hasSession() &&
        auth.msUntilExpiry() < RENEW_BEFORE_EXPIRY_MS
      ) {
        void renewRef.current();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const login = useCallback(
    async (usernameOrEmail: string, password: string) => {
      signedIn(await auth.login(usernameOrEmail, password));
    },
    [signedIn],
  );

  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
      preferences?: Partial<UserPreferences>,
    ) => {
      signedIn(await auth.register(username, email, password, preferences));
    },
    [signedIn],
  );

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
      if (auth.isUnauthorized(e))
        signedOut("Your session expired. Please sign in again.");
      throw e;
    }
  }, [signedOut]);

  const refreshUser = useCallback(async () => {
    await renew(false);
  }, [renew]);

  const patchUser = useCallback(
    (updates: Partial<User>) => {
      setUser((prev) => (prev ? { ...prev, ...updates } : prev));
      auth.markSessionRotated(900);
      schedule(900 * 1000 - RENEW_BEFORE_EXPIRY_MS);
    },
    [schedule],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      notice,
      login,
      register,
      logout,
      getWsTicket,
      refreshUser,
      patchUser,
    }),
    [
      status,
      user,
      notice,
      login,
      register,
      logout,
      getWsTicket,
      refreshUser,
      patchUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
