import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface ArchiveTournament {
  id: number;
  name: string;
  year: number;
  semester: string;
  tournamentType: string;
  competitionFormat: string;
  dateRange: string;
  sportsIncluded: string;
}

interface ArchiveTeam {
  id: number;
  tournamentId: number;
  sportName: string;
  teamName: string;
  placement: string | null;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  nrrOrDiff: string;
}

interface RosterMember {
  id: number;
  teamId: number;
  playerName: string;
  playerRole: string;
  batchYear: string;
  branch: string;
}

interface ArchiveMatch {
  id: number;
  tournamentId: number;
  sportName: string;
  stage: string;
  matchOrder: number;
  teamA: string;
  teamB: string;
  scoreA: string;
  scoreB: string;
  scheduledTime: string;
  resultSummary: string;
}

export default function ArchivePage({
  archiveYears,
}: {
  archiveYears: number[];
}) {
  const { year } = useParams<{ year: string }>();
  const activeYear = Number(year || archiveYears[0] || 2025);

  const [tournaments, setTournaments] = useState<ArchiveTournament[]>([]);
  const [teams, setTeams] = useState<ArchiveTeam[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [matches, setMatches] = useState<ArchiveMatch[]>([]);

  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>("Cricket");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [formatFilter, setFormatFilter] = useState("ALL");

  useEffect(() => {
    fetch(`/api/archive?year=${activeYear}`)
      .then((r) => r.json())
      .then((json) => {
        const tList: ArchiveTournament[] = json.tournaments || [];
        setTournaments(tList);
        setTeams(json.teams || []);
        setRoster(json.roster || []);
        setMatches(json.matches || []);

        if (tList.length > 0) {
          setSelectedTournamentId(tList[0].id);
          const firstSport = (tList[0].sportsIncluded || "Cricket")
            .split(",")[0]
            .trim();
          setSelectedSport(firstSport);
        } else {
          setSelectedTournamentId(null);
        }
        setSelectedTeamId(null);
      })
      .catch(console.error);
  }, [activeYear]);

  const filteredTournaments = tournaments.filter((t) => {
    if (typeFilter !== "ALL" && t.tournamentType !== typeFilter) return false;
    if (formatFilter !== "ALL" && t.competitionFormat !== formatFilter) return false;
    return true;
  });

  const activeTournament =
    filteredTournaments.find((t) => t.id === selectedTournamentId) ||
    filteredTournaments[0] ||
    null;

  const sportsList = activeTournament
    ? activeTournament.sportsIncluded
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const sportTeams = activeTournament
    ? teams.filter(
        (tm) =>
          tm.tournamentId === activeTournament.id &&
          tm.sportName.toLowerCase() === selectedSport.toLowerCase()
      )
    : [];

  const sportMatches = activeTournament
    ? matches
        .filter(
          (m) =>
            m.tournamentId === activeTournament.id &&
            m.sportName.toLowerCase() === selectedSport.toLowerCase()
        )
        .sort((a, b) => b.matchOrder - a.matchOrder)
    : [];

  const winner = sportTeams.find((t) => t.placement === "WINNER");
  const runnerUp1 = sportTeams.find((t) => t.placement === "RUNNER_UP_1");
  const runnerUp2 = sportTeams.find((t) => t.placement === "RUNNER_UP_2");

  const activeTeam =
    sportTeams.find((t) => t.id === selectedTeamId) || sportTeams[0] || null;
  const activeTeamMembers = activeTeam
    ? roster.filter((r) => r.teamId === activeTeam.id)
    : [];

  const q = searchQuery.trim().toLowerCase();
  const matchingPlayers = q
    ? roster.filter(
        (r) =>
          r.playerName.toLowerCase().includes(q) ||
          r.playerRole.toLowerCase().includes(q)
      )
    : [];
  const matchingTeams = q
    ? teams.filter(
        (tm) =>
          tm.teamName.toLowerCase().includes(q) ||
          tm.sportName.toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="container">
      <section className="panel">
        <h1 className="section-heading">IIITT Sports Archive — {activeYear}</h1>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search by year, sport, team, or player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Tournament Types</option>
            <option value="PROTHYMOS">Prothymos</option>
            <option value="INTER_BATCH">Inter-Batch</option>
          </select>
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
          >
            <option value="ALL">All Competition Formats</option>
            <option value="LEAGUE_KNOCKOUT">League + Knockout</option>
            <option value="KNOCKOUT">Knockout</option>
            <option value="ROUND_ROBIN">Round Robin</option>
          </select>
        </div>

        {q && (
          <div
            style={{
              background: "#18181e",
              border: "1px solid #d4a038",
              padding: 12,
              marginBottom: 16,
            }}
          >
            <strong style={{ color: "#d4a038", fontSize: 13 }}>
              Search Matches in {activeYear} ({matchingTeams.length} team(s), {matchingPlayers.length} player(s))
            </strong>
            {matchingTeams.map((tm) => (
              <div key={tm.id} className="muted" style={{ marginTop: 4 }}>
                Team: <strong>{tm.teamName}</strong> ({tm.sportName})
              </div>
            ))}
            {matchingPlayers.map((pl) => {
              const tm = teams.find((t) => t.id === pl.teamId);
              return (
                <div key={pl.id} className="muted" style={{ marginTop: 4 }}>
                  Player: <strong>{pl.playerName}</strong> — {pl.playerRole} ({pl.batchYear} · {pl.branch}) · Team: {tm?.teamName} ({tm?.sportName})
                </div>
              );
            })}
          </div>
        )}

        <h2 className="club-name" style={{ fontSize: "1rem", marginBottom: 8 }}>
          Tournaments in {activeYear}
        </h2>
        {filteredTournaments.length === 0 ? (
          <p className="muted">No archived tournaments match the selected filters for {activeYear}.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {filteredTournaments.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTournamentId(t.id);
                  const first = (t.sportsIncluded || "Cricket").split(",")[0].trim();
                  setSelectedSport(first);
                  setSelectedTeamId(null);
                }}
                style={{
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                  background: activeTournament?.id === t.id ? "#b91c1c" : "#18181e",
                  color: "#f4efe6",
                  border:
                    activeTournament?.id === t.id
                      ? "1px solid #d4a038"
                      : "1px solid rgba(244,239,230,0.16)",
                }}
              >
                {t.name} ({t.dateRange})
              </button>
            ))}
          </div>
        )}

        {activeTournament && (
          <>
            <h2 className="club-name" style={{ fontSize: "1rem", marginBottom: 8 }}>
              Sports
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sportsList.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => {
                    setSelectedSport(sp);
                    setSelectedTeamId(null);
                  }}
                  style={{
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "uppercase",
                    background: selectedSport === sp ? "#d4a038" : "#18181e",
                    color: selectedSport === sp ? "#08080a" : "#f4efe6",
                    border: "1px solid rgba(244,239,230,0.16)",
                  }}
                >
                  {sp}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {activeTournament && (
        <>
          <section className="panel">
            <h2 className="section-heading">
              {selectedSport} — Winners & Runners-Up
            </h2>
            <div className="grid-3">
              <div className="club-card" style={{ display: "block" }}>
                <div className="muted">WINNER (CHAMPIONS)</div>
                <h3 className="club-name" style={{ marginTop: 6 }}>
                  {winner ? winner.teamName : "Not recorded"}
                </h3>
              </div>
              <div className="club-card" style={{ display: "block" }}>
                <div className="muted">1ST RUNNER-UP</div>
                <h3 className="club-name" style={{ marginTop: 6 }}>
                  {runnerUp1 ? runnerUp1.teamName : "Not recorded"}
                </h3>
              </div>
              <div className="club-card" style={{ display: "block" }}>
                <div className="muted">2ND RUNNER-UP</div>
                <h3 className="club-name" style={{ marginTop: 6 }}>
                  {runnerUp2 ? runnerUp2.teamName : "Not recorded"}
                </h3>
              </div>
            </div>

            <h2 className="section-heading" style={{ marginTop: 24 }}>
              {selectedSport} — Points Table
            </h2>
            {sportTeams.length === 0 ? (
              <p className="muted">No points table recorded for {selectedSport}.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
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
                    {sportTeams.map((tm) => (
                      <tr key={tm.id} style={{ borderBottom: "1px solid rgba(244,239,230,0.12)" }}>
                        <td style={{ padding: 8 }}><strong>{tm.teamName}</strong></td>
                        <td style={{ padding: 8 }}>{tm.played}</td>
                        <td style={{ padding: 8 }}>{tm.won}</td>
                        <td style={{ padding: 8 }}>{tm.lost}</td>
                        <td style={{ padding: 8 }}>{tm.drawn}</td>
                        <td style={{ padding: 8, color: "#d4a038", fontWeight: 700 }}>{tm.points}</td>
                        <td style={{ padding: 8 }}>{tm.nrrOrDiff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            <section className="panel">
              <h2 className="section-heading">
                Games Played (Final → Opening Match)
              </h2>
              {sportMatches.length === 0 ? (
                <p className="muted">No match records for {selectedSport}.</p>
              ) : (
                <ul className="list-clean">
                  {sportMatches.map((m) => (
                    <li key={m.id} className="list-item-row" style={{ display: "block" }}>
                      <div style={{ color: "#d4a038", fontWeight: 700, fontSize: 12 }}>
                        {m.stage} · {m.scheduledTime}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <strong>{m.teamA}</strong> ({m.scoreA}) vs{" "}
                        <strong>{m.teamB}</strong> ({m.scoreB})
                      </div>
                      <div className="muted" style={{ marginTop: 2 }}>
                        {m.resultSummary}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2 className="section-heading">Teams & Squad Roster</h2>
              {sportTeams.length === 0 ? (
                <p className="muted">No teams recorded for {selectedSport}.</p>
              ) : (
                <>
                  <select
                    style={{ width: "100%", marginBottom: 14 }}
                    value={activeTeam?.id || ""}
                    onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                  >
                    {sportTeams.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.teamName}
                      </option>
                    ))}
                  </select>

                  {activeTeam && (
                    <ul className="list-clean">
                      {activeTeamMembers.length === 0 ? (
                        <li className="muted">No roster members listed for this team.</li>
                      ) : (
                        activeTeamMembers.map((mem) => (
                          <li key={mem.id} className="list-item-row">
                            <div>
                              <strong>{mem.playerName}</strong>
                              <div className="muted">{mem.playerRole}</div>
                            </div>
                            <span className="muted">
                              {mem.batchYear} · {mem.branch}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
