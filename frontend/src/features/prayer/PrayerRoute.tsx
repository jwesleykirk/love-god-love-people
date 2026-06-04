import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Illustration } from "@/components/Illustration";
import {
  fetchPrayerQueue,
  fetchPrayerSession,
  fetchPrayerSchedules,
  getPauseSeconds,
  setPauseSeconds,
  updatePrayerSchedule,
  PRAYER_FREQUENCIES,
  type PrayerFrequency,
  type PrayerQueue,
  type PrayerScheduleRow,
} from "./api";

export default function PrayerRoute() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<PrayerQueue | null>(null);
  const [schedules, setSchedules] = useState<PrayerScheduleRow[]>([]);
  const [pauseSeconds, setPause] = useState(getPauseSeconds);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [rhythmOpen, setRhythmOpen] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    setPause(getPauseSeconds());
    fetchPrayerQueue()
      .then(setQueue)
      .catch((e) => setError(e instanceof Error ? e.message : "failed"));
    fetchPrayerSchedules()
      .then((d) => setSchedules(d.schedules))
      .catch(() => {});
  }, []);

  function onPauseChange(v: number) {
    setPause(v);
    setPauseSeconds(v);
  }

  async function beginSession() {
    setPreparing(true);
    setError(null);
    try {
      const s = await fetchPrayerSession(pauseSeconds);
      if (s.segments.length === 0) {
        setRhythmOpen(true);
        return;
      }
      navigate("/pray/session", { state: { session: s, pauseSeconds } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setPreparing(false);
    }
  }

  async function setFrequency(personId: number, frequency: PrayerFrequency) {
    setSavingId(personId);
    try {
      await updatePrayerSchedule(personId, frequency);
      setSchedules((prev) =>
        prev.map((r) => (r.person_id === personId ? { ...r, frequency } : r)),
      );
      const q = await fetchPrayerQueue();
      setQueue(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setSavingId(null);
    }
  }

  const dueCount = queue?.stats.due_count ?? 0;
  const estMin = queue?.stats.estimated_minutes ?? 0;

  return (
    <main className="container devotional-screen devotional-screen--prayer">
      <Link to="/" className="muted" style={{ fontSize: "var(--text-label)" }}>
        ← Home
      </Link>

      <div className="prayer-altar" style={{ marginTop: "var(--space-4)" }}>
        <div className="row" style={{ gap: "var(--space-4)", alignItems: "center" }}>
          {/* ILLUSTRATION_PLACEHOLDER: prayer-hero.svg */}
          <Illustration slot="prayer-hero" size="xl" label="prayer" />
          <div>
            <h1 className="hero-title" style={{ margin: 0 }}>Prayer time</h1>
            <p className="hero-sub" style={{ margin: 0 }}>
              A quiet guided session for the people on your heart.
            </p>
          </div>
        </div>

        <div className="card card--paper prayer-stats" style={{ marginTop: "var(--space-6)" }}>
          <p className="prayer-stat-number">{dueCount}</p>
          <p className="prayer-stat-label">
            {dueCount === 1 ? "person today" : "people today"}
            {estMin > 0 && (
              <span className="muted"> · about {estMin} min</span>
            )}
          </p>
          <p className="muted" style={{ marginTop: "var(--space-2)", fontSize: "var(--text-caption)" }}>
            Guided prompts from the people you know
          </p>
          <button
            type="button"
            className="prayer-cta"
            style={{ width: "100%", marginTop: "var(--space-6)" }}
            disabled={preparing || dueCount === 0}
            onClick={() => void beginSession()}
          >
            {preparing ? "Preparing…" : "Begin prayer time"}
          </button>
          {dueCount === 0 && (
            <p className="muted" style={{ marginTop: "var(--space-3)" }}>
              Set a rhythm below for the people you want to pray for.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>
      )}

      {dueCount > 0 && queue && (
        <div className="card">
          <h3 style={{ margin: 0 }}>Today&apos;s queue</h3>
          <ul className="bare" style={{ marginTop: "var(--space-3)" }}>
            {queue.due.map((seg) => (
              <li key={seg.person_id}>
                <strong>{seg.person_name}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card card--inset">
        <label className="label" htmlFor="pause-slider">
          Pause between prompts
        </label>
        <div className="row row--between">
          <input
            id="pause-slider"
            type="range"
            min={10}
            max={100}
            step={5}
            value={pauseSeconds}
            onChange={(e) => onPauseChange(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span className="muted" style={{ minWidth: "3rem", textAlign: "right" }}>
            {pauseSeconds}s
          </span>
        </div>
      </div>

      <div className="card">
        <button
          type="button"
          className="prayer-rhythm-toggle"
          onClick={() => setRhythmOpen((o) => !o)}
          aria-expanded={rhythmOpen}
        >
          <h3 style={{ margin: 0 }}>Prayer rhythm</h3>
          <span className="muted">{rhythmOpen ? "▾" : "▸"}</span>
        </button>
        {rhythmOpen && (
          <ul className="bare" style={{ marginTop: "var(--space-4)" }}>
            {schedules.map((r) => (
              <li key={r.person_id} className="prayer-schedule-row">
                <div style={{ marginBottom: "var(--space-2)" }}>
                  <strong>{r.person_name}</strong>
                  <span className="muted"> · {r.relationship_category}</span>
                </div>
                <div className="chip-row" style={{ margin: 0, padding: 0 }}>
                  {PRAYER_FREQUENCIES.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      className={`chip-btn${r.frequency === f.value ? " chip-btn--active" : ""}`}
                      disabled={savingId === r.person_id}
                      onClick={() => void setFrequency(r.person_id, f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
