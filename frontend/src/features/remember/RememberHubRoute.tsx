import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDue } from "@/components/formatDue";
import { fetchFlashcardQueue, type FlashcardQueue } from "./api";

export default function RememberHubRoute() {
  const [queue, setQueue] = useState<FlashcardQueue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlashcardQueue()
      .then(setQueue)
      .catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, []);

  const dueCount = queue?.stats.due_count ?? 0;
  const deckCount = queue?.stats.deck_count ?? 0;

  return (
    <main className="container devotional-screen devotional-screen--remember">
      <Link to="/" className="muted" style={{ fontSize: "var(--text-label)" }}>
        ← Home
      </Link>
      <h1 className="hero-title" style={{ marginTop: "var(--space-4)" }}>
        Remember
      </h1>
      <p className="hero-sub">
        Recall the details you have stored about the people you love.
      </p>

      {error && (
        <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>
      )}

      <div className="card card--paper remember-stats">
        <p className="remember-stat-number">{dueCount}</p>
        <p className="remember-stat-label">due today</p>
        <p className="muted" style={{ marginTop: "var(--space-3)" }}>
          {deckCount} fact{deckCount === 1 ? "" : "s"} in your deck
        </p>
        {dueCount > 0 ? (
          <div style={{ marginTop: "var(--space-6)" }}>
            <Link to="/remember/session">
              <button className="primary-pill" style={{ width: "100%" }}>
                Begin review
              </button>
            </Link>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: "var(--space-4)" }}>
            {deckCount === 0
              ? "Approve properties in Review to build your deck."
              : "You are caught up. Next cards appear as they come due."}
          </p>
        )}
      </div>

      {queue && queue.upcoming.length > 0 && (
        <div className="card">
          <h3 style={{ margin: 0 }}>Coming up</h3>
          <ul className="bare" style={{ marginTop: "var(--space-3)" }}>
            {queue.upcoming.map((c) => (
              <li key={c.id}>
                <div className="row row--between">
                  <span>
                    <strong>{c.person_name}</strong>
                    <span className="muted"> · {c.property_label}</span>
                  </span>
                  <span className="muted" style={{ fontSize: "var(--text-caption)" }}>
                    {formatDue(c.due_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
