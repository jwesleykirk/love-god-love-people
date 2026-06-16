import { Route } from "react-router-dom";

import { JournalDetailRoute, JournalRoute } from "./JournalRoute";

export const journalRoutes = (
  <>
    <Route path="/journal" element={<JournalRoute />} />
    <Route path="/journal/:id" element={<JournalDetailRoute />} />
  </>
);
