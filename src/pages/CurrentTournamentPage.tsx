import React, { useEffect, useState } from "react";
import type { DemoUser } from "../App";

interface TournamentDetail {
  id: number;
  name: string;
  year: number;
  semester: string;
  dateRange: string;
  structureNotes: string;
  sportsIncluded: string;
  status: string;
}

interface TeamStanding {
  id: number;
  sportName: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  nrrOrDiff: string;
}

interface MatchItem {
  id: number;
  sportName: string;
  stage: string;
  matchOrder: number;
  teamA: string;
  teamB: string;
  scoreA: string;
  scoreB: string;
  status: string;
  scheduledTime: string;
  venue: string;
  resultSummary: string;
  detailedBreakdown: string;
}

export default function CurrentTournamentPage({
  currentUser,
  onLiveStateChange,
}: {
  currentUser: DemoUser | null;
  onLiveStateChange: () => void;
}) {
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [teams, setTeams] = useState<TeamStanding[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("Cricket");
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [msg, setMsg] = useState("");

  const [editStructure, setEditStructure] = useState("");
  const [editSports, setEditSports] = useState("");
  const [editDates, setEditDates] = useState("");
  const [notifyEveryone, setNotifyEveryone] = useState(true);

  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [matchStatus, setMatchStatus] = useState("LIVE");
  const [resultSummary, setResultSummary] = useState("");
  const [breakdown, setBreakdown] = useState("");

  const [fixSport, setFixSport] = useState("Cricket");
  const [fixStage, setFixStage] = useState("Semi-Final");
  const [fixTeamA, setFixTeamA] = useState("");
  const [fixTeamB, setFixTeamB] = useState("");
  const [fixTime, setFixTime] = useState("Tomorrow, 4:30 PM");
  const [fixVenue, setFixVenue] = useState("IIITT Cricket Ground");

  const isAdmin =
    currentUser &&
    ["SPORTS_SECRETARY", "FACULTY_ADVISOR"].includes(currentUser.role);
  const isScorer =
    currentUser &&
    ["MATCH_SCORER", "SPORTS_SECRETARY", "FACULTY_ADVISOR"].includes(
      currentUser.role
    );

  async function loadCurrent() {
    const res = await fetch("/api/tournaments/current");
    if (!res.ok) return;
    const json = await res.json();
    setTournament(json.tournament);
    setTeams(json.teams || []);
    setMatches(json.matches || []);

    if (json.tournament) {
      setEditStructure(json.tournament.structureNotes || "");
      setEditSports(json.tournament.sportsIncluded || "");
      setEditDates(json.tournament.dateRange || "");
      const sportsList = (json.tournament.sportsIncluded || "Cricket")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (sportsList.length > 0 && !sportsList.includes(selectedSport)) {
        setSelectedSport(sportsList[0]);
      }
    }

    const live = (json.matches || []).find((m: MatchItem) => m.status === "LIVE");
    if (live) {
      setScoreA(live.scoreA);
      setScoreB(live.scoreB);
      setMatchStatus(live.status);
      setResultSummary(live.resultSummary);
      setBreakdown(live.detailedBreakdown);
    }
  }

  useEffect(() => {
    loadCurrent();
  }, []);

  async function handleSaveStructure(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament || !currentUser) return;
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorUserId: currentUser.id,
        dateRange: editDates,
        sportsIncluded: editSports,
        structureNotes: editStructure,
        notifyEveryone,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "Failed to update tournament");
      return;
    }
    setMsg(
      notifyEveryone
        ? `Tournament structure updated & notified ${json.notifiedCount} user(s).`
        : "Tournament structure updated silently."
    );
    await loadCurrent();
  }

  async function handleUpdateLiveScore(matchId: number) {
    if (!currentUser) return;
    const res = await fetch(`/api/matches/${matchId}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorUserId: currentUser.id,
        scoreA,
        scoreB,
        status: matchStatus,
        resultSummary,
        detailedBreakdown: breakdown,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "Score update failed");
      return;
    }
    setMsg("Match score & status updated live.");
    await loadCurrent();
    onLiveStateChange();
  }

  async function handleAddFixture(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament || !currentUser) return;
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorUserId: currentUser.id,
        tournamentId: tournament.id,
        sportName: fixSport,
        stage: fixStage,
        matchOrder: matches.length + 1,
        teamA: fixTeamA,
        teamB: fixTeamB,
        scheduledTime: fixTime,
        venue: fixVenue,
        status: "UPCOMING",
        notifyEveryone,
      }),
    });
    if (res.ok) {
      setFixTeamA("");
      setFixTeamB("");
      setMsg("Fixture added to current tournament.");
      await loadCurrent();
      onLiveStateChange();
    }
  }

  if (!tournament) {
    return (
      <div className="container">
        <p className="muted">Loading current semester tournament...</p>
      </div>
    );
  }

  const sportsList = tournament.sportsIncluded
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const liveMatch = matches.find((m) => m.status === "LIVE");
  const sportStandings = teams.filter(
    (t) => t.sportName.toLowerCase() === selectedSport.toLowerCase()
  );
  const sportPastMatches = matches.filter(
    (m) =>
      m.sportName.toLowerCase() === selectedSport.toLowerCase() &&
      m.status !== "LIVE"
  );

  return (
    <div className="container">
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 className="club-name" style={{ fontSize: "1.7rem" }}>
              {tournament.name}
            </h1>
            <div className="muted">
              {tournament.dateRange} · {tournament.semester} Semester Event
            </div>
            <p style={{ fontSize: 13, marginTop: 8 }}>{tournament.structureNotes}</p>
          </div>
        </div>

        {msg && <p style={{ color: "#d4a038", fontSize: 13 }}>{msg}</p>}

        {isAdmin && (
          <form onSubmit={handleSaveStructure} style={{ marginTop: 14, borderTop: "1px solid rgba(244,239,230,0.16)", paddingTop: 14 }}>
            <strong style={{ fontSize: 13, textTransform: "uppercase", color: "#d4a038" }}>
              Sports Secretary — Configure Tournament Sports, Timetable & Structure
            </strong>
            <div className="form-grid">
              <input
                value={editDates}
                onChange={(e) => setEditDates(e.target.value)}
                placeholder="Tournament Dates"
              />
              <input
                value={editSports}
                onChange={(e) => setEditSports(e.target.value)}
                placeholder="Sports (comma-separated)"
              />
              <input
                value={editStructure}
                onChange={(e) => setEditStructure(e.target.value)}
                placeholder="Structure & Timetable Rules"
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
                Save Structure
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <h2 className="section-heading">Current Happening Match (Live)</h2>
        {liveMatch ? (
          <div>
            <div className="list-item-row" style={{ alignItems: "center" }}>
              <div>
                <span style={{ background: "#b91c1c", padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 8 }}>
                  LIVE
                </span>
                <strong>{liveMatch.sportName}</strong> · {liveMatch.stage}
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6, color: "#d4a038" }}>
                  {liveMatch.teamA}: {liveMatch.scoreA} &nbsp;|&nbsp; {liveMatch.teamB}: {liveMatch.scoreB}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {liveMatch.resultSummary} · {liveMatch.venue}
                </div>
              </div>
            </div>

            {isScorer && (
              <div style={{ marginTop: 14 }}>
                <strong style={{ fontSize: 12, textTransform: "uppercase", color: "#d4a038" }}>
                  On-Field Match Scorer Live Update
                </strong>
                <div className="form-grid">
                  <input
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    placeholder={`${liveMatch.teamA} Score`}
                  />
                  <input
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    placeholder={`${liveMatch.teamB} Score`}
                  />
                  <select
                    value={matchStatus}
                    onChange={(e) => setMatchStatus(e.target.value)}
                  >
                    <option value="LIVE">LIVE</option>
                    <option value="COMPLETED">COMPLETED (Finish Match)</option>
                  </select>
                  <input
                    value={resultSummary}
                    onChange={(e) => setResultSummary(e.target.value)}
                    placeholder="Status / Result line"
                  />
                  <input
                    value={breakdown}
                    onChange={(e) => setBreakdown(e.target.value)}
                    placeholder="Detailed points / innings breakdown"
                  />
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handleUpdateLiveScore(liveMatch.id)}
                  >
                    Push Live Score
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="muted">
            No match is currently live on the field. Check the sport bar below for past matches and points tables.
          </p>
        )}
      </section>

      <section className="panel">
        <h2 className="section-heading">Tournament Sports — Points Table & Past Matches</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {sportsList.map((sport) => (
            <button
              key={sport}
              type="button"
              onClick={() => {
                setSelectedSport(sport);
                setSelectedMatch(null);
              }}
              style={{
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 700,
                textTransform: "uppercase",
                fontSize: 12,
                background: selectedSport === sport ? "#b91c1c" : "#18181e",
                color: "#f4efe6",
                border:
                  selectedSport === sport
                    ? "1px solid #d4a038"
                    : "1px solid rgba(244,239,230,0.16)",
              }}
            >
              {sport}
            </button>
          ))}
        </div>

        <h3 className="club-name" style={{ fontSize: "1rem", marginBottom: 8 }}>
          {selectedSport} — Points Table
        </h3>
        {sportStandings.length === 0 ? (
          <p className="muted">No points table entries recorded for {selectedSport} yet.</p>
        ) : (
          <div style={{ overflowX: "auto", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #d4a038", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>Team</th>
                  <th style={{ padding: 8 }}>P</th>
                  <th style={{ padding: 8 }}>W</th>
                  <th style={{ padding: 8 }}>L</th>
                  <th style={{ padding: 8 }}>D</th>
                  <th style={{ padding: 8 }}>Pts</th>
                  <th style={{ padding: 8 }}>NRR / Diff</th>
                </tr>
              </thead>
              <tbody>
                {sportStandings.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid rgba(244,239,230,0.12)" }}>
                    <td style={{ padding: 8 }}><strong>{row.teamName}</strong></td>
                    <td style={{ padding: 8 }}>{row.played}</td>
                    <td style={{ padding: 8 }}>{row.won}</td>
                    <td style={{ padding: 8 }}>{row.lost}</td>
                    <td style={{ padding: 8 }}>{row.drawn}</td>
                    <td style={{ padding: 8, color: "#d4a038", fontWeight: 700 }}>{row.points}</td>
                    <td style={{ padding: 8 }}>{row.nrrOrDiff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="club-name" style={{ fontSize: "1rem", marginBottom: 8 }}>
          {selectedSport} — Past & Scheduled Matches (Click a match for detailed points breakdown)
        </h3>
        {sportPastMatches.length === 0 ? (
          <p className="muted">No matches listed for {selectedSport} yet.</p>
        ) : (
          <ul className="list-clean">
            {sportPastMatches.map((m) => (
              <li
                key={m.id}
                className="list-item-row"
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedMatch(m)}
              >
                <div>
                  <strong>{m.stage}:</strong> {m.teamA} ({m.scoreA}) vs {m.teamB} ({m.scoreB})
                  <div className="muted">{m.resultSummary}</div>
                </div>
                <span className="muted">{m.scheduledTime}</span>
              </li>
            ))}
          </ul>
        )}

        {selectedMatch && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              background: "#18181e",
              border: "1px solid #d4a038",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ color: "#d4a038" }}>
                Detailed Match Breakdown — {selectedMatch.teamA} vs {selectedMatch.teamB}
              </strong>
              <button
                type="button"
                className="nav-pill"
                onClick={() => setSelectedMatch(null)}
              >
                Close
              </button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, marginTop: 8 }}>
              {selectedMatch.detailedBreakdown || selectedMatch.resultSummary}
            </pre>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="panel">
          <h2 className="section-heading">Schedule New Fixture (Sports Secretary)</h2>
          <form onSubmit={handleAddFixture} className="form-grid">
            <select value={fixSport} onChange={(e) => setFixSport(e.target.value)}>
              {sportsList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              value={fixStage}
              onChange={(e) => setFixStage(e.target.value)}
              placeholder="Stage (e.g. Semi-Final)"
            />
            <input
              required
              value={fixTeamA}
              onChange={(e) => setFixTeamA(e.target.value)}
              placeholder="Team A"
            />
            <input
              required
              value={fixTeamB}
              onChange={(e) => setFixTeamB(e.target.value)}
              placeholder="Team B"
            />
            <input
              value={fixTime}
              onChange={(e) => setFixTime(e.target.value)}
              placeholder="Time"
            />
            <input
              value={fixVenue}
              onChange={(e) => setFixVenue(e.target.value)}
              placeholder="Venue"
            />
            <button type="submit" className="action-btn">
              Add Fixture
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
