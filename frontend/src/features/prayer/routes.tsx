import { Route } from "react-router-dom";

import { PrayerListRoute } from "./PrayerListRoute";
import { PrayerDetailRoute, PrayerFormRoute } from "./PrayerRoutes";

export const prayerRoutes = (
  <>
    <Route path="/prayer" element={<PrayerListRoute />} />
    <Route path="/prayer/new" element={<PrayerFormRoute />} />
    <Route path="/prayer/:id" element={<PrayerDetailRoute />} />
    <Route path="/prayer/:id/edit" element={<PrayerFormRoute />} />
  </>
);
