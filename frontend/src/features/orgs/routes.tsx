import { Route } from "react-router-dom";
import OrgsListRoute from "./OrgsListRoute";
import OrgNewRoute from "./OrgNewRoute";
import OrgDetailRoute from "./OrgDetailRoute";

export const orgsRoutes = (
  <>
    <Route path="/orgs" element={<OrgsListRoute />} />
    <Route path="/orgs/new" element={<OrgNewRoute />} />
    <Route path="/orgs/:id" element={<OrgDetailRoute />} />
  </>
);
