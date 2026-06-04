import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DevotionalCard } from "@/components/DevotionalCard";
import { SessionChrome } from "@/components/SessionChrome";
import { Illustration } from "@/components/Illustration";
import {
  completePrayerSession,
  fetchPrayerSession,
  getPauseSeconds,
  type PrayerSegment,
  type PrayerSession,
} from "./api";

const CATEGORY_LABEL: Record<string, string> = {
  family: "Family",
  friend: "Friend",
  work: "Work",
  neighbor: "Neighbor",
  ministry: "Ministry",
  other: "Other",
};

type Phase = "loading" | "settle" | "intro" | "segment" | "rest" | "complete" | "empty";

type LocationState = {
  session?: PrayerSession;
  pauseSeconds?: number;
};

export default function PrayerSessionRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? {};

  const [session, setSession] = useState<PrayerSession | null>(state.session ?? null);
  const [pauseSeconds] = useState(state.pauseSeconds ?? getPauseSeconds());
  const [phase, setPhase] = useState<Phase>(state.session ? "settle" : "loading");
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [prayedIds, setPrayedIds] = useState<number[]>([]);
  const [restCountdown, setRestCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const restTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const s = await fetchPrayerSession(pauseSeconds);
    setSession(s);
    if (s.segments.length === 0) {
      setPhase("empty");
    } else {
      setPhase("settle");
    }
  }, [pauseSeconds]);

  useEffect(() => {
    if (!state.session) {
      load().catch((e) => setError(e instanceof Error ? e.message : "failed"));
    }
  }, [load, state.session]);

  const finishSession = useCallback(async (ids: number[]) => {
    setCompleting(true);
    try {
      if (ids.length > 0) {
        await completePrayerSession(ids);
      }
      setPhase("complete");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setCompleting(false);
    }
  }, []);

  const advanceAfterRest = useCallback(() => {
    if (!session) return;
    const next = segmentIndex + 1;
    if (next >= session.segments.length) {
      void finishSession(prayedIds);
    } else {
      setSegmentIndex(next);
      setPhase("segment");
    }
  }, [session, segmentIndex, prayedIds, finishSession]);

  useEffect(() => {
    if (phase !== "rest") return;
    setRestCountdown(pauseSeconds);
    restTimer.current = setInterval(() => {
      setRestCountdown((c) => {
        if (c <= 1) {
          if (restTimer.current) clearInterval(restTimer.current);
          setTimeout(() => advanceAfterRest(), 0);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (restTimer.current) clearInterval(restTimer.current);
    };
  }, [phase, pauseSeconds, advanceAfterRest]);

  const segments = session?.segments ?? [];
  const seg: PrayerSegment | undefined = segments[segmentIndex];

  function continueFromIntro() {
    setSegmentIndex(0);
    setPhase("segment");
  }

  function prayedForSegment() {
    if (!seg) return;
    const nextIds = prayedIds.includes(seg.person_id)
      ? prayedIds
      : [...prayedIds, seg.person_id];
    setPrayedIds(nextIds);
    if (segmentIndex + 1 >= segments.length) {
      void finishSession(nextIds);
    } else {
      setRestCountdown(pauseSeconds);
      setPhase("rest");
    }
  }

  function skipSegment() {
    if (segmentIndex + 1 >= segments.length) {
      void finishSession(prayedIds);
    } else {
      setRestCountdown(pauseSeconds);
      setPhase("rest");
    }
  }

  if (phase === "loading") {
    return (
      <main className="container devotional-screen devotional-screen--prayer">
        <p className="muted">Preparing your prayer time…</p>
      </main>
    );
  }

  if (phase === "empty") {
    return (
      <main className="container devotional-screen devotional-screen--prayer">
        <SessionChrome backTo="/pray" backLabel="Prayer" />
        <div className="card card--paper" style={{ marginTop: "var(--space-8)", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif)" }}>No one due today</h2>
          <p className="muted">Set prayer rhythms on the Prayer home screen.</p>
          <Link to="/pray" style={{ marginTop: "var(--space-4)", display: "inline-block" }}>
            <button type="button">Back to Prayer</button>
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "complete") {
    return (
      <main className="container devotional-screen devotional-screen--prayer">
        <div className="card card--paper prayer-complete" style={{ marginTop: "var(--space-12)" }}>
          <h2 className="prayer-complete-title">Amen</h2>
          <p className="muted">
            {prayedIds.length > 0
              ? `You prayed for ${prayedIds.length} ${prayedIds.length === 1 ? "person" : "people"} today.`
              : "Peace be with you."}
          </p>
          <div className="stack" style={{ marginTop: "var(--space-6)" }}>
            <button type="button" onClick={() => navigate("/pray")}>
              Done
            </button>
            <Link to="/">
              <button type="button" className="secondary">Home</button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="container devotional-screen devotional-screen--prayer">
        <p className="muted" style={{ color: "var(--color-warning)" }}>{error || "Could not load session"}</p>
      </main>
    );
  }

  if (phase === "settle") {
    return (
      <main className="container devotional-screen devotional-screen--prayer session-layout session-layout--fullscreen">
        <SessionChrome backTo="/pray" backLabel="Leave" />
        <div className="prayer-settle">
          <p className="devotional-eyebrow">Prepare your heart</p>
          <p className="prayer-settle-text">Take a breath. When you are ready, we will begin together.</p>
          <button type="button" className="prayer-cta" onClick={() => setPhase("intro")}>
            I&apos;m ready
          </button>
        </div>
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="container devotional-screen devotional-screen--prayer session-layout">
        <SessionChrome backTo="/pray" backLabel="Leave" caption="Introduction" />
        <DevotionalCard
          variant="prayer"
          eyebrow="Introduction"
          title={session.intro}
          revealed
          footer={
            <button type="button" className="prayer-cta" onClick={continueFromIntro}>
              Continue
            </button>
          }
        />
      </main>
    );
  }

  if (phase === "rest") {
    return (
      <main className="container devotional-screen devotional-screen--prayer session-layout">
        <SessionChrome
          backTo="/pray"
          backLabel="Leave"
          progress={{ current: segmentIndex + 1, total: segments.length }}
          caption="Rest"
        />
        <div className="card card--paper prayer-rest">
          <p className="prayer-rest-label muted">Quiet</p>
          <p className="prayer-stat-number">{restCountdown}</p>
          <p className="muted">seconds before the next name</p>
          <button
            type="button"
            className="secondary"
            style={{ marginTop: "var(--space-6)" }}
            onClick={() => {
              if (restTimer.current) clearInterval(restTimer.current);
              advanceAfterRest();
            }}
          >
            Continue now
          </button>
        </div>
      </main>
    );
  }

  if (!seg) return null;

  return (
    <main className="container devotional-screen devotional-screen--prayer session-layout">
      <SessionChrome
        backTo="/pray"
        backLabel="Leave"
        progress={{ current: segmentIndex + 1, total: segments.length }}
        caption={seg.person_name}
      />

      {error && (
        <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>
      )}

      <div className="prayer-session-illust">
        <Illustration slot={seg.relationship_category} size="xl" label="" />
      </div>

      <DevotionalCard
        variant="prayer"
        eyebrow={CATEGORY_LABEL[seg.relationship_category] || seg.relationship_category}
        title={seg.person_name}
        subtitle="We pray"
        revealed
        body={
          <div className="prayer-guided">
            <p className="prayer-guided-text">{seg.guided_text}</p>
            {seg.context_lines.length > 0 && (
              <ul className="bare prayer-context-list muted">
                {seg.context_lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        }
        footer={
          <div className="rating-row rating-row--prayer">
            <button type="button" className="secondary" disabled={completing} onClick={skipSegment}>
              Skip
            </button>
            <button type="button" className="prayer-cta" disabled={completing} onClick={prayedForSegment}>
              {completing ? "…" : "Amen · next"}
            </button>
          </div>
        }
      />
    </main>
  );
}
