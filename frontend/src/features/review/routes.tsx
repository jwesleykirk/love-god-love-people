import { Route } from "react-router-dom";
import ReviewRoute from "./ReviewRoute";

export const reviewRoutes = (
  <Route path="/review" element={<ReviewRoute />} />
);
