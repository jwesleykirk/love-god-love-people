import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";

import { IconHome, IconJournal, IconPeople, IconPrayer } from "./components/NavIcons";
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

  const tabs = [
    { path: "/", label: "Home", icon: IconHome, match: () => is("/") },
    { path: "/people", label: "People", icon: IconPeople, match: () => is("/people") || is("/groups") },
    { path: "/prayer", label: "Prayer", icon: IconPrayer, match: () => is("/prayer") },
    { path: "/journal", label: "Journal", icon: IconJournal, match: () => is("/journal") },
  ] as const;

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map(({ path, label, icon: Icon, match }) => {
        const active = match();
        return (
          <NavLink key={path} to={path} className={active ? "active" : ""} end={path === "/"}>
            {active ? (
              <span className="bn-pill">
                <Icon size={19} />
              </span>
            ) : (
              <Icon />
            )}
            <span className="bn-label">{label}</span>
          </NavLink>
        );
      })}
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
