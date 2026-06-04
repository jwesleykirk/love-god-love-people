import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPrayerSchedules,
  PRAYER_FREQUENCIES,
  updatePrayerSchedule,
  type PrayerFrequency,
  type PrayerScheduleRow,
} from "./api";

export default function PraySettingsRoute() {
  const [rows, setRows] = useState<PrayerScheduleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPrayerSchedules()
      .then((d) => setRows(d.schedules))
      .catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, []);

  async function setFrequency(personId: number, frequency: PrayerFrequency) {
    setSavingId(personId);
    setError(null);
    try {
      await updatePrayerSchedule(personId, frequency);
      setRows((prev) =>
        prev.map((r) => (r.person_id === personId ? { ...r, frequency } : r)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="container devotional-screen devotional-screen--prayer">
      <Link to="/pray" className="muted" style={{ fontSize: "var(--text-label)" }}>
        ← Pray
      </Link>
      <h1 className="hero-title" style={{ marginTop: "var(--space-4)" }}>
        Prayer rhythm
      </h1>
      <p className="hero-sub">How often would you like to pray for each person?</p>

      {error && (
        <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>
      )}

      <ul className="bare">
        {rows.map((r) => (
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
    </main>
  );
}
