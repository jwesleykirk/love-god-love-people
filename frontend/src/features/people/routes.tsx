import { Route } from "react-router-dom";
import PeopleListRoute from "./PeopleListRoute";
import PersonNewRoute from "./PersonNewRoute";
import PersonDetailRoute from "./PersonDetailRoute";

export const peopleRoutes = (
  <>
    <Route path="/people" element={<PeopleListRoute />} />
    <Route path="/people/new" element={<PersonNewRoute />} />
    <Route path="/people/:id" element={<PersonDetailRoute />} />
  </>
);
