import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { IconPlus } from "@/components/NavIcons";
import { fetchPeople, fetchGroups } from "../api";
import type { Group, Person } from "../types";

export function PeopleRoute() {
  const [tab, setTab] = useState<"people" | "groups">("people");
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    void fetchPeople().then(setPeople);
    void fetchGroups().then(setGroups);
  }, []);

  return (
    <main className="container">
      <header className="page-header">
        <h1 className="large-title">People</h1>
        <Link
          className="glass-icon-btn"
          to={tab === "people" ? "/people/new" : "/groups/new"}
          aria-label={tab === "people" ? "Add person" : "Add group"}
        >
          <IconPlus />
        </Link>
      </header>

      <div className="tab-row" role="tablist">
        <button
          type="button"
          role="tab"
          className={`tab ${tab === "people" ? "tab--active" : ""}`}
          onClick={() => setTab("people")}
        >
          People
        </button>
        <button
          type="button"
          role="tab"
          className={`tab ${tab === "groups" ? "tab--active" : ""}`}
          onClick={() => setTab("groups")}
        >
          Groups
        </button>
      </div>

      <div className="grouped-list">
        {tab === "people" && people.map((p) => (
          <Link key={p.id} to={`/people/${p.id}`} className="grouped-list-row">
            <div style={{ flex: 1 }}>
              <div className="grouped-list-title">{p.name}</div>
              <div className="grouped-list-meta">{p.life_stage}</div>
            </div>
            <span className="grouped-list-chevron" aria-hidden>›</span>
          </Link>
        ))}

        {tab === "groups" && groups.map((g) => (
          <Link key={g.id} to={`/groups/${g.id}`} className="grouped-list-row">
            <div style={{ flex: 1 }}>
              <div className="grouped-list-title">{g.name}</div>
              {g.member_count != null && (
                <div className="grouped-list-meta">{g.member_count} members</div>
              )}
            </div>
            <span className="grouped-list-chevron" aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
