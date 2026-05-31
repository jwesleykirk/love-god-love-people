import { Link, Route, Routes } from "react-router-dom";

import { exampleRoutes } from "./features/example/routes";

function Home() {
  return (
    <main className="container">
      <h1>S3 Prototype Template</h1>
      <p>
        This is the SPA shell. Each feature lives under{" "}
        <code>src/features/&lt;feature&gt;/</code> and registers its routes in
        the array below.
      </p>
      <ul>
        <li>
          <Link to="/example">/example — sample feature</Link>
        </li>
      </ul>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {exampleRoutes}
    </Routes>
  );
}
