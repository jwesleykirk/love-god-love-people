import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IconSettings } from "@/components/NavIcons";
import {
  buildGuideNow,
  fetchTodayGuide,
  fetchTopics,
  sessionAmen,
  sessionTopicAction,
} from "../api";
import type { PrayerSession, PrayerTopic } from "../types";

function isFullSession(s: PrayerSession): s is PrayerSession & { id: number } {
  return typeof s.id === "number";
}

function formatDateLabel(d = new Date()) {
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${weekday} · ${monthDay}`;
}

function guideMeta(session: PrayerSession | null, topics: PrayerTopic[]) {
  const prayers = session?.logs?.length ?? Math.min(topics.length, 5);
  return { reading: "Today's reading", prayers };
}

function topicMeta(topic: PrayerTopic) {
  if (topic.person) return `${topic.person.name} · ${topic.target_frequency}`;
  if (topic.group) return `${topic.group.name} · ${topic.target_frequency}`;
  return `General · ${topic.target_frequency}`;
}

export function HomeRoute() {
  const [session, setSession] = useState<PrayerSession | null>(null);
  const [topics, setTopics] = useState<PrayerTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set());
  const [noteTopicId, setNoteTopicId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [data, activeTopics] = await Promise.all([
        fetchTodayGuide(),
        fetchTopics({ active: "1" }),
      ]);
      setSession(data);
      setTopics(activeTopics);
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
    setPlaying(false);
    void load();
  };

  const handleTopicToggle = async (topicId: number, on: boolean) => {
    if (!session?.id) return;
    if (on) {
      setAnsweredIds((prev) => new Set(prev).add(topicId));
      setNoteTopicId(topicId);
    } else {
      setAnsweredIds((prev) => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
      if (noteTopicId === topicId) {
        setNoteTopicId(null);
        setNoteText("");
      }
    }
  };

  const handleSaveNote = async (topicId: number) => {
    if (!session?.id) return;
    await sessionTopicAction(session.id, topicId, "record_answer", noteText || undefined);
    setNoteTopicId(null);
    setNoteText("");
    void load();
  };

  const prayingToday = useMemo(() => {
    if (session?.logs && session.logs.length > 0) {
      return session.logs.map((log) => {
        const topic = topics.find((t) => t.id === log.topic_id);
        return {
          id: log.topic_id,
          title: log.topic_narration,
          meta: topic ? topicMeta(topic) : "Prayer topic",
          href: topic ? `/prayer/${topic.id}` : "/prayer",
        };
      });
    }
    return topics.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.narration_text || t.topic_text,
      meta: topicMeta(t),
      href: `/prayer/${t.id}`,
    }));
  }, [session?.logs, topics]);

  if (loading) {
    return (
      <main className="container">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const failed = session?.build_status === "failed";
  const pending = !session?.id || session.build_status === "pending";
  const ready = session?.build_status === "ready" && Boolean(session.audio_url);
  const completed = Boolean(session?.completed_at);

  const { reading, prayers } = guideMeta(session, topics);
  const guideReadyLabel = ready ? "Morning Prayer · ready" : "Morning Prayer";

  const finishPlayback = () => {
    setPlaying(false);
    if (!completed) {
      setReviewMode(true);
    }
  };

  if (playing && ready && session) {
    return (
      <main className="container stack-lg">
        <header className="page-header">
          <div>
            <div className="meta-label">{formatDateLabel()}</div>
            <h1 className="large-title">Morning Prayer</h1>
          </div>
          <button
            type="button"
            className="glass-icon-btn"
            aria-label="Back"
            onClick={() => setPlaying(false)}
          >
            ←
          </button>
        </header>
        <div className="hero-card stack">
          <p className="muted">{reading}</p>
          <audio
            controls
            autoPlay
            playsInline
            preload="metadata"
            src={session.audio_url ?? undefined}
            style={{ width: "100%" }}
            onEnded={finishPlayback}
          />
          {!completed && (
            <button type="button" className="secondary" onClick={finishPlayback}>
              Skip to review
            </button>
          )}
        </div>
      </main>
    );
  }

  if (reviewMode && session && isFullSession(session)) {
    return (
      <main className="container review-sheet">
        <div className="review-sheet-header">
          <div className="word-display">Amen.</div>
          <p className="muted">Anything answered today?</p>
        </div>

        {(session.logs ?? []).map((log) => {
          const answered = answeredIds.has(log.topic_id);
          return (
            <div key={log.id} className="review-topic-card">
              <div className="review-topic-row">
                <span className="grouped-list-title">{log.topic_narration}</span>
                <button
                  type="button"
                  className={`toggle ${answered ? "toggle--on" : ""}`}
                  aria-pressed={answered}
                  aria-label={answered ? "Mark as not answered" : "Mark as answered"}
                  onClick={() => void handleTopicToggle(log.topic_id, !answered)}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
              {answered && noteTopicId === log.topic_id && (
                <>
                  <div className="meta-label" style={{ marginTop: 14, marginBottom: 7 }}>
                    How did God answer this?
                  </div>
                  <textarea
                    className="review-note-field"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Record what God did…"
                  />
                  <button
                    type="button"
                    className="secondary"
                    style={{ marginTop: 10, width: "100%" }}
                    onClick={() => void handleSaveNote(log.topic_id)}
                  >
                    Save note
                  </button>
                </>
              )}
            </div>
          );
        })}

        <div className="review-amen-bar">
          <button type="button" className="btn-amen" onClick={() => void handleAmen()}>
            Amen
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="page-header">
        <div>
          <div className="meta-label">{formatDateLabel()}</div>
          <h1 className="large-title">Today</h1>
        </div>
        <Link to="/settings" className="glass-icon-btn" aria-label="Settings">
          <IconSettings />
        </Link>
      </header>

      {failed && (
        <div className="hero-card stack">
          <p>Today's guide couldn't be prepared.</p>
          <button type="button" className="btn-primary" onClick={() => void handleBuild()} disabled={building}>
            {building ? "Building…" : "Build now"}
          </button>
        </div>
      )}

      {pending && !failed && (
        <div className="hero-card stack">
          <div className="meta-label">{guideReadyLabel}</div>
          <p className="word-headline">Today's guide<br />will be ready soon.</p>
          <p className="muted">{session?.detail ?? "Your morning guide is being prepared."}</p>
          <button type="button" className="btn-primary" onClick={() => void handleBuild()} disabled={building}>
            {building ? "Building…" : "Build now"}
          </button>
        </div>
      )}

      {ready && (
        <div className="hero-card">
          <div className="meta-label">{guideReadyLabel}</div>
          <p className="word-headline" style={{ marginTop: 9 }}>
            {completed ? (
              <>Today's guide<br />is complete.</>
            ) : (
              <>Today's guide<br />is ready.</>
            )}
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            {reading}
            {prayers > 0 ? ` · ${prayers} prayer${prayers === 1 ? "" : "s"}` : ""}
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 18 }}
            onClick={() => setPlaying(true)}
          >
            {completed ? "Replay guide" : "Begin guide"}
          </button>
        </div>
      )}

      {prayingToday.length > 0 && (
        <>
          <div className="meta-label" style={{ margin: "24px 6px 9px" }}>Praying today</div>
          <div className="grouped-list">
            {prayingToday.map((row) => (
              <Link key={row.id} to={row.href} className="grouped-list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="grouped-list-title">{row.title}</div>
                  <div className="grouped-list-meta">{row.meta}</div>
                </div>
                <span className="grouped-list-chevron" aria-hidden>›</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
