import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DevotionalCard } from "@/components/DevotionalCard";
import { SessionChrome } from "@/components/SessionChrome";
import { Illustration } from "@/components/Illustration";
import { fetchPrayerQueue, markPrayed, type PrayerCard } from "./api";

const CATEGORY_LABEL: Record<string, string> = {
  family: "Family",
  friend: "Friend",
  work: "Work",
  neighbor: "Neighbor",
  ministry: "Ministry",
  other: "Other",
};

export default function PraySessionRoute() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<PrayerCard[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    const q = await fetchPrayerQueue();
    setCards(q.due);
    if (q.due.length === 0) setDone(true);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, [load]);

  const card = cards[index];

  async function prayed() {
    if (!card || busy) return;
    setBusy(true);
    setError(null);
    try {
      await markPrayed(card.person_id);
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

  function later() {
    if (index + 1 >= cards.length) {
      navigate("/pray");
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (done) {
    return (
      <main className="container devotional-screen devotional-screen--prayer">
        <SessionChrome backTo="/pray" backLabel="Pray" />
        <div className="card card--paper prayer-complete" style={{ marginTop: "var(--space-8)" }}>
          <h2 className="prayer-complete-title">Amen</h2>
          <p className="muted">You have tended your prayer list for today.</p>
          <div className="stack" style={{ marginTop: "var(--space-6)" }}>
            <button type="button" onClick={() => navigate("/pray")}>
              Back to Pray
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
      <main className="container devotional-screen devotional-screen--prayer">
        <p className="muted">{error || "Loading…"}</p>
        <Link to="/pray/settings">Set prayer rhythms →</Link>
      </main>
    );
  }

  return (
    <main className="container devotional-screen devotional-screen--prayer session-layout">
      <SessionChrome
        backTo="/pray"
        backLabel="Pray"
        progress={{ current: index + 1, total: cards.length }}
        caption="Prayer"
      />

      {error && (
        <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>
      )}

      <div className="prayer-session-illust">
        <Illustration slot={card.relationship_category} size="xl" label="" />
      </div>

      <DevotionalCard
        variant="prayer"
        eyebrow={CATEGORY_LABEL[card.relationship_category] || card.relationship_category}
        title={card.person_name}
        subtitle="Before the Lord"
        revealed
        body={
          <div className="prayer-prompts">
            {card.prompts.length > 0 ? (
              <ul className="bare prayer-prompt-list">
                {card.prompts.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                {card.full_name} — hold them in your heart. What do you want to ask God for them?
              </p>
            )}
          </div>
        }
        footer={
          <div className="rating-row rating-row--prayer">
            <button type="button" className="secondary" disabled={busy} onClick={later}>
              Later
            </button>
            <button type="button" className="prayer-cta" disabled={busy} onClick={() => void prayed()}>
              I prayed
            </button>
          </div>
        }
      />
    </main>
  );
}
