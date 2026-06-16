import { Route } from "react-router-dom";

import { GroupDetailRoute, GroupFormRoute } from "./GroupRoutes";
import { PeopleRoute } from "./PeopleRoute";
import { PersonDetailRoute, PersonFormRoute } from "./PersonRoutes";

export const peopleRoutes = (
  <>
    <Route path="/people" element={<PeopleRoute />} />
    <Route path="/people/new" element={<PersonFormRoute />} />
    <Route path="/people/:id" element={<PersonDetailRoute />} />
    <Route path="/people/:id/edit" element={<PersonFormRoute />} />
    <Route path="/groups/new" element={<GroupFormRoute />} />
    <Route path="/groups/:id" element={<GroupDetailRoute />} />
    <Route path="/groups/:id/edit" element={<GroupFormRoute />} />
  </>
);
