import { Route } from "react-router-dom";

import ExampleRoute from "./ExampleRoute";

/**
 * Routes for this feature. Imported and spread in App.tsx so each feature
 * owns its own routing surface.
 */
export const exampleRoutes = (
  <Route path="/example" element={<ExampleRoute />} />
);
