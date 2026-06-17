import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchSession, fetchSessions } from "../api";
import type { PrayerSession } from "../types";

export function JournalRoute() {
  const [sessions, setSessions] = useState<PrayerSession[]>([]);

  useEffect(() => {
    void fetchSessions().then(setSessions);
  }, []);

  return (
    <main className="container">
      <header className="page-header">
        <h1 className="large-title">Journal</h1>
      </header>
      <p className="section-sub">Prayer session history</p>

      <div className="grouped-list">
        {sessions.map((s) => (
          <Link key={s.id} to={`/journal/${s.id}`} className="grouped-list-row">
            <div style={{ flex: 1 }}>
              <div className="grouped-list-title">{s.session_date}</div>
              <div className="grouped-list-meta">
                {s.topic_count ?? 0} topics
                {s.answered_count ? ` · ${s.answered_count} answered` : ""}
                {s.completed_at ? " · completed" : ""}
              </div>
            </div>
            <span className="grouped-list-chevron" aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

export function JournalDetailRoute() {
  const { id } = useParams();
  const [session, setSession] = useState<PrayerSession | null>(null);

  useEffect(() => {
    if (id) void fetchSession(Number(id)).then(setSession);
  }, [id]);

  if (!session) return <main className="container"><p className="muted">Loading…</p></main>;

  return (
    <main className="container stack-lg">
      <Link to="/journal" className="session-back">← Journal</Link>
      <h1 className="large-title">{session.session_date}</h1>
      <div className="grouped-list">
        {(session.logs ?? []).map((log) => (
          <div key={log.id} className="grouped-list-row" style={{ cursor: "default" }}>
            <div style={{ flex: 1 }}>
              <div className="grouped-list-title">{log.topic_narration}</div>
              {(log.answered || log.answer_note) && (
                <div className="grouped-list-meta">
                  {log.answered ? "answered" : ""}
                  {log.answer_note ? ` — ${log.answer_note}` : ""}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
