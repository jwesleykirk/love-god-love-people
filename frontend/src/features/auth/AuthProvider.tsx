import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";

export type Auth = {
  authenticated: boolean;
  auth_enabled: boolean;
  login_url: string;
  logout_url: string;
  user?: {
    id: number;
    email: string;
    username: string;
    first_name: string;
  };
};

type AuthCtx = {
  auth: Auth | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  login: () => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await apiFetch<Auth>("/api/auth/me/");
      setAuth(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "auth check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(() => {
    if (auth?.login_url) window.location.href = auth.login_url;
  }, [auth]);

  const logout = useCallback(() => {
    if (auth?.logout_url) window.location.href = auth.logout_url;
  }, [auth]);

  return (
    <Ctx.Provider value={{ auth, loading, error, refresh, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
