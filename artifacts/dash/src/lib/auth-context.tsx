import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { API } from "./config";

/** Canonical Grudge ID gateway — never invent a parallel password UI. */
const ID_BASE = (API.auth || "https://id.grudge-studio.com").replace(/\/$/, "");

export interface AdminUser {
  token: string;
  grudgeId: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  /** Redirect browser to id.grudge-studio.com (canonical). */
  loginWithGrudgeId: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const STORAGE_KEY = "grudge_dash_session";
/** Align with fleet token keys so other tools can share session if needed */
const FLEET_TOKEN_KEYS = [
  "grudge_auth_token",
  "grudge_session_token",
  "grudge.token",
  "sso_token",
  "grudge_token",
] as const;

const ADMIN_ROLES = new Set(["admin", "master", "owner", "master_admin", "master-admin"]);

function saveSession(user: AdminUser) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  try {
    localStorage.setItem("grudge_auth_token", user.token);
    localStorage.setItem("grudge_id", user.grudgeId);
    if (user.username) localStorage.setItem("grudge_username", user.username);
  } catch {
    /* ignore quota / private mode */
  }
}

function loadSession(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    for (const k of FLEET_TOKEN_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

function buildCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

/** Canonical login: id.grudge-studio.com/login?redirect_uri=<dash>/auth/callback */
export function buildDashLoginUrl(): string {
  const callback = buildCallbackUrl();
  return `${ID_BASE}/login?redirect_uri=${encodeURIComponent(callback)}&app=dash`;
}

function takeTokenFromUrl(): string | null {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

  const keys = ["grudge_token", "sso_token", "token"];
  let token: string | null = null;
  for (const k of keys) {
    token = params.get(k) || hash.get(k);
    if (token) break;
  }
  if (!token) return null;

  // Strip token params from address bar
  for (const k of keys) {
    params.delete(k);
    hash.delete(k);
  }
  const clean =
    url.pathname +
    (params.toString() ? `?${params}` : "") +
    (hash.toString() ? `#${hash}` : "");
  window.history.replaceState({}, "", clean || "/");
  return token;
}

function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.has(String(role).toLowerCase());
}

async function fetchMe(token: string): Promise<{
  id?: string;
  username?: string;
  displayName?: string;
  grudgeId?: string;
  grudge_id?: string;
  role?: string;
}> {
  // Prefer same-origin proxy when available, then ID hub API
  const bases = [
    `${window.location.origin}/api/auth/me`,
    `${ID_BASE}/api/auth/me`,
    `${API.api}/api/auth/me`,
  ];
  let lastErr = "Could not verify session";
  for (const url of bases) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: url.startsWith(window.location.origin) ? "include" : "omit",
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        lastErr = `Session verify failed (${res.status})`;
        continue;
      }
      return await res.json();
    } catch (e: any) {
      lastErr = e?.message || lastErr;
    }
  }
  throw new Error(lastErr);
}

async function exchangeLaunchToken(token: string): Promise<string> {
  // Popup/launch tokens may need exchange into a session JWT
  const bases = [
    `${ID_BASE}/api/auth/session/exchange`,
    `${API.api}/api/auth/session/exchange`,
  ];
  for (const url of bases) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.token || data.accessToken) return data.token || data.accessToken;
      // Some exchanges set cookie only — keep original token for Bearer me
      return token;
    } catch {
      /* try next */
    }
  }
  return token;
}

async function establishAdminSession(rawToken: string): Promise<AdminUser> {
  let token = rawToken;
  // Launch tokens from ID handoff are short-lived; exchange when possible
  token = await exchangeLaunchToken(rawToken);
  const me = await fetchMe(token);
  const role = me.role || "player";
  if (!isAdminRole(role)) {
    throw new Error("Access denied — admin or master role required on this Grudge ID");
  }
  return {
    token,
    grudgeId: me.grudgeId || me.grudge_id || "",
    username: me.displayName || me.username || "Admin",
    role: String(role).toLowerCase(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setError(null);
      try {
        // 1) Canonical return from id.grudge-studio.com
        const urlToken = takeTokenFromUrl();
        if (urlToken) {
          const admin = await establishAdminSession(urlToken);
          if (cancelled) return;
          saveSession(admin);
          setUser(admin);
          return;
        }

        // 2) Restore prior session
        const saved = loadSession();
        if (saved?.token) {
          try {
            const admin = await establishAdminSession(saved.token);
            if (cancelled) return;
            saveSession(admin);
            setUser(admin);
            return;
          } catch {
            clearSession();
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          clearSession();
          setError(e?.message || "Sign-in failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithGrudgeId = useCallback(() => {
    setError(null);
    window.location.assign(buildDashLoginUrl());
  }, []);

  const logout = useCallback(() => {
    if (user?.token) {
      fetch(`${ID_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
        credentials: "include",
      }).catch(() => {});
    }
    clearSession();
    setUser(null);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, loginWithGrudgeId, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const { user, loading } = useAuth();

  // Local vite dev can still hit production ID — keep optional bypass
  const isDev = import.meta.env?.DEV && import.meta.env.VITE_DASH_AUTH_BYPASS === "1";
  if (isDev) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img
            src="/grudge-id-logo.png"
            alt=""
            className="w-14 h-14 mx-auto mb-3 rounded-full object-cover ring-1 ring-primary/40"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://id.grudge-studio.com/grudge-id-logo.png";
            }}
          />
          <p className="text-sm text-muted-foreground">Checking Grudge ID session…</p>
        </div>
      </div>
    );
  }

  if (!user) return <>{fallback}</>;
  return <>{children}</>;
}
