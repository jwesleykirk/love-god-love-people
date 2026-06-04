import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Illustration } from "@/components/Illustration";
import { fetchPrayerQueue, type PrayerQueue } from "./api";

export default function PrayHubRoute() {
  const [queue, setQueue] = useState<PrayerQueue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrayerQueue()
      .then(setQueue)
      .catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, []);

  const dueCount = queue?.stats.due_count ?? 0;
  const scheduled = queue?.stats.scheduled_count ?? 0;

  return (
    <main className="container devotional-screen devotional-screen--prayer">
      <Link to="/" className="muted" style={{ fontSize: "var(--text-label)" }}>
        ← Home
      </Link>

      <div className="row" style={{ gap: "var(--space-4)", marginTop: "var(--space-4)", alignItems: "center" }}>
        {/* ILLUSTRATION_PLACEHOLDER: prayer-hero.svg */}
        <Illustration slot="prayer-hero" size="lg" label="prayer" />
        <div>
          <h1 className="hero-title" style={{ margin: 0 }}>Pray</h1>
          <p className="hero-sub" style={{ margin: 0 }}>
            Lift the people on your heart before the Lord.
          </p>
        </div>
      </div>

      {error && (
        <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>
      )}

      <div className="card card--paper prayer-stats">
        <p className="prayer-stat-number">{dueCount}</p>
        <p className="prayer-stat-label">waiting today</p>
        <p className="muted" style={{ marginTop: "var(--space-3)" }}>
          {scheduled} on your prayer rhythm
        </p>
        {dueCount > 0 ? (
          <div style={{ marginTop: "var(--space-6)" }}>
            <Link to="/pray/session">
              <button className="prayer-cta" style={{ width: "100%" }}>
                Enter prayer time
              </button>
            </Link>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: "var(--space-4)" }}>
            {scheduled === 0
              ? "Choose a rhythm for each person below."
              : "You have prayed for everyone due today. Peace."}
          </p>
        )}
      </div>

      <div className="row row--between" style={{ marginBottom: "var(--space-3)" }}>
        <h3 style={{ margin: 0 }}>Prayer rhythm</h3>
        <Link to="/pray/settings" className="muted" style={{ fontSize: "var(--text-label)" }}>
          All people →
        </Link>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Set how often you want to remember each person in prayer.
      </p>
      <Link to="/pray/settings">
        <button type="button" className="secondary" style={{ width: "100%" }}>
          Manage schedules
        </button>
      </Link>
    </main>
  );
}
