import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IconPlus, IconSearch } from "@/components/NavIcons";
import { fetchTopics } from "../api";
import type { PrayerTopic } from "../types";

type Filter = "all" | "person" | "group" | "general";

function topicSubtitle(t: PrayerTopic) {
  const who = t.person?.name ?? t.group?.name ?? "General";
  const when = t.next_scheduled_date
    ? new Date(t.next_scheduled_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "today";
  return `${who} · ${when}`;
}

export function PrayerListRoute() {
  const [topics, setTopics] = useState<PrayerTopic[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = { active: "1" };
    if (filter === "person") params.has_person = "1";
    if (filter === "group") params.has_group = "1";
    if (filter === "general") params.general = "1";
    setLoading(true);
    void fetchTopics(params)
      .then(setTopics)
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((t) =>
      (t.narration_text || t.topic_text).toLowerCase().includes(q) ||
      t.person?.name.toLowerCase().includes(q) ||
      t.group?.name.toLowerCase().includes(q),
    );
  }, [topics, query]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "person", label: "Person" },
    { key: "group", label: "Group" },
    { key: "general", label: "General" },
  ];

  return (
    <main className="container">
      <header className="page-header">
        <h1 className="large-title">Prayer</h1>
        <Link to="/prayer/new" className="glass-icon-btn" aria-label="Add prayer topic">
          <IconPlus />
        </Link>
      </header>

      <Link to="/prayer/import" className="card card--inset" style={{ display: "block" }}>
        <div className="grouped-list-title">Import a prayer list</div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Paste names and requests, review AI suggestions, then choose what to save.
        </p>
      </Link>

      <div className="glass-search">
        <IconSearch />
        <input
          type="search"
          placeholder="Search topics"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search topics"
        />
      </div>

      <div className="segmented-control" role="tablist" aria-label="Filter topics">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? "active" : ""}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grouped-list">
        {loading && <p className="muted" style={{ padding: 16 }}>Loading…</p>}
        {!loading && filtered.map((t) => (
          <Link key={t.id} to={`/prayer/${t.id}`} className="grouped-list-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="grouped-list-title">{t.narration_text || t.topic_text}</div>
              <div className="grouped-list-meta">{topicSubtitle(t)}</div>
            </div>
            <span className={`freq-pill ${t.target_frequency === "monthly" ? "freq-pill--muted" : ""}`}>
              {t.target_frequency}
            </span>
          </Link>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="muted" style={{ padding: 16 }}>No topics match.</p>
        )}
      </div>
    </main>
  );
}
