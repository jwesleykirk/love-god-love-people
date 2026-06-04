import { Navigate, Route } from "react-router-dom";
import PrayerRoute from "./PrayerRoute";
import PrayerSessionRoute from "./PrayerSessionRoute";

export const prayerRoutes = (
  <>
    <Route path="/pray" element={<PrayerRoute />} />
    <Route path="/pray/session" element={<PrayerSessionRoute />} />
    <Route path="/pray/settings" element={<Navigate to="/pray" replace />} />
  </>
);
