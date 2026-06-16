import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
    <main className="container stack-lg">
      <div className="topbar">
        <h1>People</h1>
        <Link className="action-link" to={tab === "people" ? "/people/new" : "/groups/new"}>+ Add</Link>
      </div>
      <p className="muted section-sub">Keep relationships and groups easy to review.</p>

      <div className="tab-row">
        <button className={`tab ${tab === "people" ? "tab--active" : ""}`} onClick={() => setTab("people")}>
          People
        </button>
        <button className={`tab ${tab === "groups" ? "tab--active" : ""}`} onClick={() => setTab("groups")}>
          Groups
        </button>
      </div>

      {tab === "people" && (
        <ul className="bare">
          {people.map((p) => (
            <li key={p.id}>
              <Link to={`/people/${p.id}`}>{p.name}</Link>
              <span className="muted"> · {p.life_stage}</span>
            </li>
          ))}
        </ul>
      )}

      {tab === "groups" && (
        <ul className="bare">
          {groups.map((g) => (
            <li key={g.id}>
              <Link to={`/groups/${g.id}`}>{g.name}</Link>
              {g.member_count != null && (
                <span className="muted"> · {g.member_count} members</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
