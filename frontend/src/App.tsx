import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";

import { homeRoutes } from "./features/home/routes";
import { peopleRoutes } from "./features/people/routes";
import { prayerRoutes } from "./features/prayer/routes";
import { journalRoutes } from "./features/journal/routes";
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
        <span className="bn-icon">🏠</span>
        <span>Home</span>
      </NavLink>
      <NavLink to="/people" className={is("/people") || is("/groups") ? "active" : ""}>
        <span className="bn-icon">👥</span>
        <span>People</span>
      </NavLink>
      <NavLink to="/prayer" className={is("/prayer") ? "active" : ""}>
        <span className="bn-icon">🙏</span>
        <span>Prayer</span>
      </NavLink>
      <NavLink to="/journal" className={is("/journal") ? "active" : ""}>
        <span className="bn-icon">📝</span>
        <span>Journal</span>
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
        {prayerRoutes}
        {journalRoutes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </AuthGate>
  );
}
