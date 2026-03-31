import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const ID_BASE = "https://id.grudge-studio.com";

// ── Types ────────────────────────────────────────────────────────
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
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

// ── Context ──────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ── Storage helpers ──────────────────────────────────────────────
const STORAGE_KEY = "grudge_dash_session";

function saveSession(user: AdminUser) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
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
}

// ── Provider ─────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      // Verify token is still valid
      fetch(`${ID_BASE}/auth/verify`, {
        headers: { Authorization: `Bearer ${saved.token}` },
      })
        .then((r) => {
          if (r.ok) {
            setUser(saved);
          } else {
            clearSession();
          }
        })
        .catch(() => clearSession())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${ID_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.token) {
        throw new Error(data.error || "Login failed");
      }

      // Verify admin role
      const role = data.role || "player";
      if (role !== "admin" && role !== "owner") {
        throw new Error("Access denied — admin role required");
      }

      const adminUser: AdminUser = {
        token: data.token,
        grudgeId: data.grudgeId || data.grudge_id || "",
        username: data.username || data.displayName || "Admin",
        role,
      };

      saveSession(adminUser);
      setUser(adminUser);
    } catch (e: any) {
      setError(e.message || "Login failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget server-side logout
    if (user?.token) {
      fetch(`${ID_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      }).catch(() => {});
    }
    clearSession();
    setUser(null);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Auth Gate ────────────────────────────────────────────────────
// Wraps the app — shows login page if not authenticated.
export function AuthGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl gold-text font-bold mb-2">⚔ GRUDGE</div>
          <p className="text-sm text-muted-foreground">Verifying credentials…</p>
        </div>
      </div>
    );
  }

  if (!user) return <>{fallback}</>;
  return <>{children}</>;
}
