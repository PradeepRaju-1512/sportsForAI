import React, { useEffect, useState } from "react";
import type { DemoUser } from "../App";

interface TournamentRow {
  id: number;
  name: string;
  year: number;
  semester: string;
  tournamentType: string;
  competitionFormat: string;
  dateRange: string;
  structureNotes: string;
  sportsIncluded: string;
  status: string;
}

export default function OverviewPage({
  currentUser,
}: {
  currentUser: DemoUser | null;
}) {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDates, setEditDates] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [notifyEveryone, setNotifyEveryone] = useState(true);
  const [feedback, setFeedback] = useState("");

  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState("2027");
  const [newSemester, setNewSemester] = useState("ODD");
  const [newDates, setNewDates] = useState("");
  const [newSports, setNewSports] = useState("Cricket,Football,Volleyball,Badminton");
  const [newNotes, setNewNotes] = useState("");

  const isAdmin =
    currentUser &&
    ["SPORTS_SECRETARY", "FACULTY_ADVISOR"].includes(currentUser.role);

  async function loadOverview() {
    const res = await fetch("/api/tournaments/overview");
    if (!res.ok) return;
    const json = await res.json();
    setTournaments(json.tournaments || []);
  }

  useEffect(() => {
    loadOverview();
  }, []);

  function startEdit(t: TournamentRow) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDates(t.dateRange);
    setEditNotes(t.structureNotes);
    setNotifyEveryone(true);
    setFeedback("");
  }

  async function saveEdit(id: number) {
    if (!currentUser) return;
    const res = await fetch(`/api/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorUserId: currentUser.id,
        name: editName,
        dateRange: editDates,
        structureNotes: editNotes,
        notifyEveryone,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedback(json.error || "Update failed");
      return;
    }
    setEditingId(null);
    setFeedback(
      notifyEveryone
        ? `Saved & notified ${json.notifiedCount} user(s).`
        : "Saved silently without sending notifications."
    );
    await loadOverview();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorUserId: currentUser.id,
        name: newName,
        year: Number(newYear),
        semester: newSemester,
        dateRange: newDates,
        sportsIncluded: newSports,
        structureNotes: newNotes,
        notifyEveryone,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedback(json.error || "Failed to add tournament");
      return;
    }
    setNewName("");
    setNewDates("");
    setNewNotes("");
    setFeedback(
      notifyEveryone
        ? `Tournament added & notified ${json.notifiedCount} user(s).`
        : "Tournament added silently."
    );
    await loadOverview();
  }

  return (
    <div className="container">
      <section className="panel">
        <h1 className="section-heading">Upcoming & Active Tournaments Overview</h1>
        <p className="muted">
          Official IIITT semester sports calendar. Updated by the Sports Secretary.
        </p>

        {feedback && (
          <p style={{ color: "#d4a038", fontSize: 13, marginTop: 10 }}>
            {feedback}
          </p>
        )}

        <ul className="list-clean" style={{ marginTop: 14 }}>
          {tournaments.map((t) => (
            <li key={t.id} className="list-item-row" style={{ display: "block" }}>
              {editingId === t.id ? (
                <div className="form-grid">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Tournament Name"
                  />
                  <input
                    value={editDates}
                    onChange={(e) => setEditDates(e.target.value)}
                    placeholder="Dates (e.g. Feb 12 – Feb 16, 2027)"
                  />
                  <input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Structure / Notes"
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={notifyEveryone}
                      onChange={(e) => setNotifyEveryone(e.target.checked)}
                    />
                    Notify everyone
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => saveEdit(t.id)}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="nav-pill"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <strong style={{ color: "#d4a038", fontSize: 15 }}>
                      {t.name}
                    </strong>{" "}
                    <span className="muted">
                      ({t.semester} Sem · {t.status})
                    </span>
                    <div style={{ marginTop: 4, fontSize: 13 }}>
                      <strong>Dates:</strong> {t.dateRange}
                    </div>
                    <div className="muted" style={{ marginTop: 2 }}>
                      Sports: {t.sportsIncluded}
                    </div>
                    {t.structureNotes && (
                      <div className="muted" style={{ marginTop: 2 }}>
                        {t.structureNotes}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => startEdit(t)}
                      >
                        Edit Dates / Details
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <section className="panel">
          <h2 className="section-heading">Add Upcoming Tournament (Sports Secretary)</h2>
          <form onSubmit={handleCreate} className="form-grid">
            <input
              required
              placeholder="Tournament Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              required
              placeholder="Year (e.g. 2027)"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
            />
            <select
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
            >
              <option value="ODD">Odd Semester</option>
              <option value="EVEN">Even Semester</option>
            </select>
            <input
              required
              placeholder="Dates (e.g. Aug 20 – Aug 28, 2027)"
              value={newDates}
              onChange={(e) => setNewDates(e.target.value)}
            />
            <input
              placeholder="Sports (comma-separated)"
              value={newSports}
              onChange={(e) => setNewSports(e.target.value)}
            />
            <input
              placeholder="Format / Notes"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={notifyEveryone}
                onChange={(e) => setNotifyEveryone(e.target.checked)}
              />
              Notify everyone
            </label>
            <button type="submit" className="action-btn">
              Publish Tournament
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
