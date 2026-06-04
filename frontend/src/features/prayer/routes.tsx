import { Route } from "react-router-dom";
import PrayHubRoute from "./PrayHubRoute";
import PraySessionRoute from "./PraySessionRoute";
import PraySettingsRoute from "./PraySettingsRoute";

export const prayerRoutes = (
  <>
    <Route path="/pray" element={<PrayHubRoute />} />
    <Route path="/pray/session" element={<PraySessionRoute />} />
    <Route path="/pray/settings" element={<PraySettingsRoute />} />
  </>
);
