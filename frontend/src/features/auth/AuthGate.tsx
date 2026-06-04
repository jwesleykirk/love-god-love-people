import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";

/**
 * Gates the app on auth state.
 *
 * - While loading: a thin placeholder.
 * - When auth is disabled at the server (ENABLE_AUTH=False): pass through.
 * - When auth is enabled and the user is signed in: pass through.
 * - When auth is enabled and the user is NOT signed in: show a sign-in CTA.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { auth, loading, error, login } = useAuth();

  if (loading) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Something went wrong</h1>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (!auth) return null;

  if (auth.auth_enabled && !auth.authenticated) {
    return (
      <div className="container">
        <h1>Sign in</h1>
        <p className="muted">Continue with your Google account.</p>
        <button onClick={login}>Sign in with Google</button>
      </div>
    );
  }

  return <>{children}</>;
}
