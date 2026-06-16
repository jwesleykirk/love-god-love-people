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
    <main className="container stack-lg">
      <h1>Journal</h1>
      <p className="muted section-sub">Prayer session history</p>
      <ul className="bare">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link to={`/journal/${s.id}`}>
              {s.session_date}
            </Link>
            <span className="muted">
              {" "}· {s.topic_count ?? 0} topics
              {s.answered_count ? ` · ${s.answered_count} answered` : ""}
              {s.completed_at ? " · completed" : ""}
            </span>
          </li>
        ))}
      </ul>
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
      <h1>{session.session_date}</h1>
      <ul className="bare">
        {(session.logs ?? []).map((log) => (
          <li key={log.id}>
            {log.topic_narration}
            {log.answered && " · answered"}
            {log.answer_note && ` — ${log.answer_note}`}
          </li>
        ))}
      </ul>
    </main>
  );
}
