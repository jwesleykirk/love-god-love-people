import { Route } from "react-router-dom";
import EntryNewRoute from "./EntryNewRoute";

export const entriesRoutes = (
  <Route path="/entries/new" element={<EntryNewRoute />} />
);
