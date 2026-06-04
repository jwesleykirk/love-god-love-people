import { Route } from "react-router-dom";
import RememberHubRoute from "./RememberHubRoute";
import RememberSessionRoute from "./RememberSessionRoute";

export const rememberRoutes = (
  <>
    <Route path="/remember" element={<RememberHubRoute />} />
    <Route path="/remember/session" element={<RememberSessionRoute />} />
  </>
);
