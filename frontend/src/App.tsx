import { Link, Route, Routes } from "react-router-dom";

import { peopleRoutes } from "./features/people/routes";
import { entriesRoutes } from "./features/entries/routes";
import { reviewRoutes } from "./features/review/routes";
import { orgsRoutes } from "./features/orgs/routes";
import { AuthGate } from "./features/auth/AuthGate";
import { useAuth } from "./features/auth/AuthProvider";

function AppHeader() {
  const { auth, logout } = useAuth();
  return (
    <header className="app">
      <Link to="/" className="brand">LGLP</Link>
      <nav>
        <Link to="/">People</Link>
        <Link to="/orgs">Orgs</Link>
        <Link to="/entries/new">+ Entry</Link>
        <Link to="/review">Review</Link>
        {auth?.authenticated && auth.auth_enabled && (
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Sign out</a>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <AuthGate>
      <AppHeader />
      <Routes>
        {peopleRoutes}
        {entriesRoutes}
        {reviewRoutes}
        {orgsRoutes}
      </Routes>
    </AuthGate>
  );
}
