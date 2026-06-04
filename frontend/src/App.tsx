import { NavLink, Route, Routes, useLocation } from "react-router-dom";

import { peopleRoutes } from "./features/people/routes";
import { entriesRoutes } from "./features/entries/routes";
import { reviewRoutes } from "./features/review/routes";
import { orgsRoutes } from "./features/orgs/routes";
import { homeRoutes } from "./features/home/routes";
import { rememberRoutes } from "./features/remember/routes";
import { prayerRoutes } from "./features/prayer/routes";
import { AuthGate } from "./features/auth/AuthGate";

function BottomNav() {
  const location = useLocation();
  const is = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" className={is("/") ? "active" : ""} end>
        <span className="bn-icon">◯</span>
        <span>Home</span>
      </NavLink>
      <NavLink to="/people" className={is("/people") ? "active" : ""}>
        <span className="bn-icon">◐</span>
        <span>People</span>
      </NavLink>
      <NavLink to="/entries/new" className={location.pathname === "/entries/new" ? "active" : ""}>
        <span className="bn-icon">+</span>
        <span>Entry</span>
      </NavLink>
      <NavLink to="/review" className={is("/review") ? "active" : ""}>
        <span className="bn-icon">✓</span>
        <span>Review</span>
      </NavLink>
      <NavLink to="/orgs" className={is("/orgs") ? "active" : ""}>
        <span className="bn-icon">▢</span>
        <span>Orgs</span>
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <AuthGate>
      <Routes>
        {homeRoutes}
        {peopleRoutes}
        {entriesRoutes}
        {reviewRoutes}
        {orgsRoutes}
        {rememberRoutes}
        {prayerRoutes}
      </Routes>
      <BottomNav />
    </AuthGate>
  );
}
