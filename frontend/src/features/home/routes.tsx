import { Route } from "react-router-dom";
import HomeRoute from "./HomeRoute";

export const homeRoutes = (
  <Route path="/" element={<HomeRoute />} />
);
