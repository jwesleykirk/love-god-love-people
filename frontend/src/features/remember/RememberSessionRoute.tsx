import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DevotionalCard } from "@/components/DevotionalCard";
import { SessionChrome } from "@/components/SessionChrome";
import {
  fetchFlashcardQueue,
  reviewFlashcard,
  suspendFlashcard,
  type Flashcard,
} from "./api";

export default function RememberSessionRoute() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    const q = await fetchFlashcardQueue();
    setCards(q.due);
    if (q.due.length === 0) setDone(true);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, [load]);

  const card = cards[index];

  async function rate(rating: "again" | "good" | "easy") {
    if (!card || busy) return;
    setBusy(true);
    setError(null);
    try {
      await reviewFlashcard(card.id, rating);
      setRevealed(false);
      if (index + 1 >= cards.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function skipCard() {
    if (!card || busy) return;
    setBusy(true);
    try {
      await suspendFlashcard(card.id);
      setRevealed(false);
      const next = cards.filter((c) => c.id !== card.id);
      setCards(next);
      if (next.length === 0) setDone(true);
      else if (index >= next.length) setIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="container devotional-screen devotional-screen--remember">
        <SessionChrome backTo="/remember" backLabel="Remember" />
        <div className="card card--paper" style={{ textAlign: "center", marginTop: "var(--space-8)" }}>
          <h2 style={{ fontFamily: "var(--font-serif)" }}>Well done</h2>
          <p className="muted">Your due cards are cleared for now.</p>
          <div className="stack" style={{ marginTop: "var(--space-6)" }}>
            <button type="button" onClick={() => navigate("/remember")}>
              Back to Remember
            </button>
            <Link to="/">
              <button type="button" className="secondary">Home</button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="container devotional-screen">
        <p className="muted">{error || "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="container devotional-screen devotional-screen--remember session-layout">
      <SessionChrome
        backTo="/remember"
        backLabel="Remember"
        progress={{ current: index + 1, total: cards.length }}
        caption="Recall"
      />

      {error && (
        <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>
      )}

      <DevotionalCard
        variant="remember"
        eyebrow={card.person_name}
        title={card.prompt}
        subtitle={!revealed ? undefined : card.property_label}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        body={
          revealed ? (
            <>
              <p className="devotional-answer">{card.answer}</p>
              <p className="muted" style={{ marginTop: "var(--space-4)" }}>
                {card.person_name}
              </p>
            </>
          ) : undefined
        }
        footer={
          revealed ? (
            <div className="rating-row">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => void rate("again")}
              >
                Again
              </button>
              <button type="button" disabled={busy} onClick={() => void rate("good")}>
                Got it
              </button>
              <button
                type="button"
                className="primary-pill"
                disabled={busy}
                onClick={() => void rate("easy")}
              >
                Easy
              </button>
            </div>
          ) : undefined
        }
      />

      <button
        type="button"
        className="secondary session-skip"
        disabled={busy}
        onClick={() => void skipCard()}
      >
        Remove from deck
      </button>
    </main>
  );
}
