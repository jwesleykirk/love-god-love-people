import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  buildGuideNow,
  fetchTodayGuide,
  sessionAmen,
  sessionTopicAction,
} from "../api";
import { GuidePlayer } from "./GuidePlayer";
import type { PrayerSession } from "../types";

function isFullSession(s: PrayerSession): s is PrayerSession & { id: number } {
  return typeof s.id === "number";
}

export function HomeRoute() {
  const [session, setSession] = useState<PrayerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [noteTopicId, setNoteTopicId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchTodayGuide();
      setSession(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const data = await buildGuideNow();
      setSession(data);
    } finally {
      setBuilding(false);
    }
  };

  const handleAmen = async () => {
    if (!session?.id) return;
    await sessionAmen(session.id);
    setReviewMode(false);
    void load();
  };

  const handleTopicAction = async (
    topicId: number,
    action: "answered" | "record_answer",
  ) => {
    if (!session?.id) return;
    await sessionTopicAction(session.id, topicId, action, noteText || undefined);
    setNoteTopicId(null);
    setNoteText("");
    void load();
  };

  if (loading) {
    return (
      <main className="container">
        <p className="muted">Loading today's guide…</p>
      </main>
    );
  }

  const failed = session?.build_status === "failed";
  const pending = !session?.id || session.build_status === "pending";
  const ready =
    session?.build_status === "ready" &&
    ((session.playlist?.length ?? 0) > 0 || Boolean(session.audio_url));

  return (
    <main className="container stack-lg">
      <div className="topbar">
        <h1 className="hero-title topbar-title">Today's Guide</h1>
        <Link to="/settings" className="icon-link" aria-label="Settings">⚙</Link>
      </div>
      <p className="muted section-sub">One tap to start your morning prayer rhythm.</p>

      {failed && (
        <div className="card card--inset">
          <p>Today's guide couldn't be prepared — tap to build now.</p>
          <button onClick={() => void handleBuild()} disabled={building}>
            {building ? "Building…" : "Build now"}
          </button>
        </div>
      )}

      {pending && !failed && (
        <div className="card card--paper stack">
          <p className="muted">{session?.detail ?? "Your morning guide will appear here once built."}</p>
          <button className="primary-pill" onClick={() => void handleBuild()} disabled={building}>
            {building ? "Building…" : "Build now"}
          </button>
        </div>
      )}

      {ready && !reviewMode && (
        <div className="card card--paper stack devotional-screen">
          <p className="muted">{session.session_date}</p>
          <GuidePlayer
            clips={session.playlist ?? []}
            sessionDate={session.session_date}
            legacyAudioUrl={session.audio_url}
            onComplete={() => setReviewMode(true)}
            onSkipToReview={() => setReviewMode(true)}
          />
        </div>
      )}

      {reviewMode && session && isFullSession(session) && (
        <div className="stack-lg">
          <h2>Post-Session Review</h2>
          <p className="muted section-sub">Mark answered prayers and record what God did.</p>
          <ul className="bare prayer-prompt-list">
            {(session.logs ?? []).map((log) => (
              <li key={log.id} className="card card--inset stack">
                <p>{log.topic_narration}</p>
                <div className="row row--wrap">
                  <button
                    className="secondary"
                    onClick={() => void handleTopicAction(log.topic_id, "answered")}
                  >
                    Answered
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setNoteTopicId(log.topic_id)}
                  >
                    Record answer
                  </button>
                  <button className="secondary">Continue</button>
                </div>
                {noteTopicId === log.topic_id && (
                  <div className="stack">
                    <label>How did God answer this?</label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    <button
                      onClick={() => void handleTopicAction(log.topic_id, "record_answer")}
                    >
                      Save note
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button className="prayer-cta" onClick={() => void handleAmen()}>
            Amen
          </button>
        </div>
      )}

      {session?.completed_at && !reviewMode && (
        <p className="muted">Session completed. See you tomorrow.</p>
      )}
    </main>
  );
}
