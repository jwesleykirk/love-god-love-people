import { Route } from "react-router-dom";

import { HomeRoute } from "./HomeRoute";
import { SettingsRoute } from "./SettingsRoute";

export const homeRoutes = (
  <>
    <Route path="/" element={<HomeRoute />} />
    <Route path="/settings" element={<SettingsRoute />} />
  </>
);
