import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchTopics } from "../api";
import type { PrayerTopic } from "../types";

type Filter = "all" | "person" | "group" | "general";

export function PrayerListRoute() {
  const [topics, setTopics] = useState<PrayerTopic[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const params: Record<string, string> = { active: "1" };
    if (filter === "person") params.has_person = "1";
    if (filter === "group") params.has_group = "1";
    if (filter === "general") params.general = "1";
    void fetchTopics(params).then(setTopics);
  }, [filter]);

  return (
    <main className="container stack-lg">
      <div className="topbar">
        <h1>Prayer</h1>
        <Link className="action-link" to="/prayer/new">+ Add</Link>
      </div>
      <p className="muted section-sub">Active topics ready to carry into today's guide.</p>

      <div className="chip-row">
        {(["all", "person", "group", "general"] as Filter[]).map((f) => (
          <button
            key={f}
            className={`chip-btn ${filter === f ? "chip-btn--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <ul className="bare">
        {topics.map((t) => (
          <li key={t.id}>
            <Link to={`/prayer/${t.id}`}>
              {t.narration_text || t.topic_text}
            </Link>
            <span className="muted"> · {t.target_frequency}</span>
            {t.person && <span className="muted"> · {t.person.name}</span>}
            {t.group && <span className="muted"> · {t.group.name}</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
