import React, { useEffect, useMemo, useState } from "react";
import type { DemoUser } from "../App";
import type {
  AuctionConfig,
  AuctionPlayerStatus,
  AuctionRegistration,
  AuctionRound,
  PlayerClass,
} from "../types/auction";

const SPORT_POSITIONS: Record<string, string[]> = {
  Cricket: ["Batsman", "Bowler", "All-Rounder", "Wicketkeeper"],
  Football: ["Forward / Striker", "Midfielder", "Defender", "Goalkeeper"],
  Volleyball: ["Setter", "Outside Hitter", "Middle Blocker", "Libero"],
  Throwball: ["Attacker", "Defender", "All-Rounder"],
  Badminton: ["Singles", "Doubles", "Mixed"],
  "Table Tennis": ["Singles", "Doubles"],
  Kabaddi: ["Raider", "Defender", "All-Rounder"],
  "Kho Kho": ["Attacker / Chaser", "Defender / Runner"],
  Chess: ["Board 1–2", "Board 3–4", "Reserve"],
  Carrom: ["Singles", "Doubles"],
};

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "MTech"];
const BRANCHES = ["CSE", "ECE", "MECH", "EEE", "IT"];

export default function AuctionPage({
  currentUser,
  onNavigate,
}: {
  currentUser: DemoUser | null;
  onNavigate: (route: string) => void;
}) {
  const [auction, setAuction] = useState<AuctionConfig | null>(null);
  const [rounds, setRounds] = useState<AuctionRound[]>([]);
  const [registrations, setRegistrations] = useState<AuctionRegistration[]>([]);
  const [inductedSports, setInductedSports] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState("");

  // Student single-sport enrollment state (1 registration per sport; multiple positions allowed)
  const [yearLabel, setYearLabel] = useState(currentUser?.batch || "3rd Year");
  const [branch, setBranch] = useState(currentUser?.branch || "CSE");
  const [selectedSport, setSelectedSport] = useState("Cricket");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([
    "Wicketkeeper",
    "Batsman",
  ]);
  const [statsSummary, setStatsSummary] = useState("");

  // Sports Secretary post-deadline controls
  const [rosterSportTab, setRosterSportTab] = useState("Cricket");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"year" | "branch" | "position">("year");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editYear, setEditYear] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editPositions, setEditPositions] = useState("");
  const [editStatus, setEditStatus] = useState<AuctionPlayerStatus>("ELIGIBLE");

  const isSecretary =
    currentUser &&
    ["SPORTS_SECRETARY", "FACULTY_ADVISOR"].includes(currentUser.role);

  const isRegistrationClosed =
    auction &&
    ["FROZEN", "LIVE", "COMPLETED", "PUBLISHED"].includes(auction.status);

  async function loadAuctionData() {
    const res = await fetch("/api/auction", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setAuction(data.auction || null);
    setRounds(data.rounds || []);
    setRegistrations(data.registrations || []);
    setInductedSports(data.inductedSports || []);
    if (data.auction?.sports?.length) {
      if (!data.auction.sports.includes(selectedSport)) {
        setSelectedSport(data.auction.sports[0]);
      }
      if (!data.auction.sports.includes(rosterSportTab)) {
        setRosterSportTab(data.auction.sports[0]);
      }
    }
  }

  useEffect(() => {
    loadAuctionData();
  }, [currentUser?.id]);

  // Keep positions valid when switching sport
  useEffect(() => {
    const allowed = SPORT_POSITIONS[selectedSport] || ["Player"];
    setSelectedPositions((prev) => {
      const filtered = prev.filter((p) => allowed.includes(p));
      return filtered.length ? filtered : [allowed[0]];
    });
  }, [selectedSport]);

  const currentPlayerClass: PlayerClass = inductedSports.includes(selectedSport)
    ? "CLUB"
    : "NON_CLUB";

  const previewBasePrice = auction
    ? currentPlayerClass === "CLUB"
      ? auction.clubBasePrice
      : auction.nonClubBasePrice
    : currentPlayerClass === "CLUB"
      ? 10000
      : 5000;

  const alreadyEnrolledInSport = useMemo(
    () =>
      registrations.some(
        (r) =>
          currentUser &&
          r.userId === currentUser.id &&
          r.sport.toLowerCase() === selectedSport.toLowerCase()
      ),
    [registrations, currentUser, selectedSport]
  );

  function togglePosition(pos: string) {
    setSelectedPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  }

  async function handleEnrollSport(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      setStatusMsg("Please select or sign in with a user account first.");
      return;
    }
    if (selectedPositions.length === 0) {
      setStatusMsg("Select at least one playing position for this sport.");
      return;
    }

    const res = await fetch("/api/auction/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        yearLabel,
        branch,
        sport: selectedSport,
        positions: selectedPositions,
        statsSummary,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatusMsg(json.error || "Could not submit sport registration.");
      return;
    }
    setStatsSummary("");
    setStatusMsg(
      `Enrolled in ${selectedSport} (${json.registration?.playerClass || currentPlayerClass}) with positions: ${selectedPositions.join(", ")}.`
    );
    await loadAuctionData();
  }

  async function handleAdminAction(
    path: string,
    body: Record<string, unknown>,
    successText: string
  ) {
    if (!currentUser) return;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorUserId: currentUser.id, ...body }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatusMsg(json.error || "Action failed");
      return;
    }
    setStatusMsg(successText);
    await loadAuctionData();
  }

  function startEditRow(reg: AuctionRegistration) {
    setEditingId(reg.id);
    setEditYear(reg.yearLabel);
    setEditBranch(reg.branch);
    setEditPositions(reg.positions.join(", "));
    setEditStatus(reg.status);
  }

  async function saveEditRow(id: number) {
    if (!currentUser) return;
    const res = await fetch(`/api/auction/registrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorUserId: currentUser.id,
        yearLabel: editYear,
        branch: editBranch,
        positions: editPositions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: editStatus,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatusMsg(json.error || "Failed to update player entry");
      return;
    }
    setEditingId(null);
    setStatusMsg("Updated player registration.");
    await loadAuctionData();
  }

  const filteredSportRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = registrations.filter((r) => {
      if (r.sport !== rosterSportTab) return false;
      if (!q) return true;
      return (
        r.playerName.toLowerCase().includes(q) ||
        r.branch.toLowerCase().includes(q) ||
        r.yearLabel.toLowerCase().includes(q) ||
        r.positions.some((p) => p.toLowerCase().includes(q)) ||
        r.playerClass.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === "year") return a.yearLabel.localeCompare(b.yearLabel);
      if (sortBy === "branch") return a.branch.localeCompare(b.branch);
      return (a.positions[0] || "").localeCompare(b.positions[0] || "");
    });
  }, [registrations, rosterSportTab, searchQuery, sortBy]);

  if (!auction) {
    return (
      <div className="container">
        <section className="panel">
          <h1 className="section-heading">Prothymos Auction</h1>
          <p className="muted">
            No auction is currently planned. Once the Sports Secretary schedules an
            auction, student enrollment and live auction controls will appear here.
          </p>
        </section>
      </div>
    );
  }

  const availablePositions = SPORT_POSITIONS[selectedSport] || ["Player"];

  return (
    <div className="container">
      <section className="panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 className="section-heading">{auction.name}</h1>
            <p className="muted">
              Status: <strong>{auction.status}</strong> · Deadline:{" "}
              {auction.registrationDeadline} · Club Base:{" "}
              <strong>₹{auction.clubBasePrice.toLocaleString()}</strong> · Non-Club
              Base: <strong>₹{auction.nonClubBasePrice.toLocaleString()}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="action-btn"
              onClick={() => onNavigate("/live-auction")}
            >
              Open Live Auction Console
            </button>
            <button
              type="button"
              className="nav-pill"
              onClick={() => onNavigate("/live-auction/projector")}
            >
              Projector View
            </button>
          </div>
        </div>

        {statusMsg && (
          <p style={{ color: "#d4a038", fontSize: 13, marginTop: 10 }}>
            {statusMsg}
          </p>
        )}

        {/* Multi-Round Overview */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {rounds.map((rd) => (
            <div
              key={rd.id}
              className="list-item-row"
              style={{
                padding: "8px 12px",
                borderColor:
                  rd.id === auction.activeRoundId ? "#d4a038" : undefined,
              }}
            >
              <strong>{rd.name}</strong>{" "}
              <span className="muted">({rd.status})</span>
              {isSecretary && rd.id !== auction.activeRoundId && (
                <button
                  type="button"
                  className="nav-pill"
                  style={{ marginLeft: 8, padding: "2px 8px", fontSize: 11 }}
                  onClick={() =>
                    handleAdminAction(
                      "/api/auction/round",
                      { roundId: rd.id },
                      `Switched active round to ${rd.name}`
                    )
                  }
                >
                  Set Round
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Sports Secretary Lifecycle Controls */}
        {isSecretary && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <button
              type="button"
              className="nav-pill"
              onClick={() =>
                handleAdminAction(
                  "/api/auction/status",
                  { status: "REGISTRATION_OPEN" },
                  "Registration opened for students."
                )
              }
            >
              Open Registration
            </button>
            <button
              type="button"
              className="nav-pill"
              onClick={() =>
                handleAdminAction(
                  "/api/auction/status",
                  { status: "FROZEN" },
                  "Registration closed & roster frozen for Sports Secretary review."
                )
              }
            >
              Close Registration (Freeze)
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() =>
                handleAdminAction(
                  "/api/auction/status",
                  { status: "LIVE" },
                  "Auction is now LIVE across all logged-in devices."
                )
              }
            >
              Start Live Auction
            </button>
          </div>
        )}
      </section>

      {/* 1 Registration Per Sport Form (Multiple Positions Within That Sport) */}
      {!isRegistrationClosed && (
        <section className="panel">
          <h2 className="section-heading">
            Enroll in Auction (1 Registration Per Sport)
          </h2>
          <p className="muted">
            Each submission registers you for <strong>one sport</strong> with one
            or more playing positions in that sport. To enroll in another sport
            (e.g., Volleyball), submit a separate registration for that sport.
          </p>

          <form onSubmit={handleEnrollSport} className="form-grid" style={{ marginTop: 12 }}>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
            >
              {auction.sports.map((sp) => (
                <option key={sp} value={sp}>
                  Sport: {sp}
                </option>
              ))}
            </select>

            <select
              value={yearLabel}
              onChange={(e) => setYearLabel(e.target.value)}
            >
              {YEARS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              {BRANCHES.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
            </select>

            <input
              placeholder="Past experience / key stats (optional)"
              value={statsSummary}
              onChange={(e) => setStatsSummary(e.target.value)}
            />

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <strong>Positions in {selectedSport}</strong> (select one or more):
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {availablePositions.map((pos) => {
                  const active = selectedPositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      className={active ? "action-btn" : "nav-pill"}
                      onClick={() => togglePosition(pos)}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 13 }}>
                Class for <strong>{selectedSport}</strong>:{" "}
                <strong style={{ color: "#d4a038" }}>{currentPlayerClass}</strong>{" "}
                · Base Price:{" "}
                <strong>₹{previewBasePrice.toLocaleString()}</strong>
                {alreadyEnrolledInSport && (
                  <span style={{ color: "#d4a038", marginLeft: 10 }}>
                    (Already enrolled in {selectedSport})
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="action-btn"
                disabled={alreadyEnrolledInSport}
              >
                {alreadyEnrolledInSport
                  ? `Already Enrolled in ${selectedSport}`
                  : `Enroll in ${selectedSport}`}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Per-Sport Enrolled Roster + Post-Deadline Sports Secretary Search, Sort & Edit */}
      <section className="panel">
        <h2 className="section-heading">
          {isRegistrationClosed && isSecretary
            ? "Post-Deadline Enrolled Roster (By Sport)"
            : "Enrolled Players by Sport"}
        </h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {auction.sports.map((sp) => (
            <button
              key={sp}
              type="button"
              className={rosterSportTab === sp ? "action-btn" : "nav-pill"}
              onClick={() => setRosterSportTab(sp)}
            >
              {sp} (
              {registrations.filter((r) => r.sport === sp).length})
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <input
            placeholder="Search player, year, branch, position, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            Sort by:
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "year" | "branch" | "position")
              }
            >
              <option value="year">Year</option>
              <option value="branch">Branch</option>
              <option value="position">Position</option>
            </select>
          </label>
        </div>

        <ul className="list-clean" style={{ marginTop: 14 }}>
          {filteredSportRoster.map((reg) => (
            <li key={reg.id} className="list-item-row">
              {editingId === reg.id ? (
                <div className="form-grid" style={{ width: "100%" }}>
                  <input
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    placeholder="Year"
                  />
                  <input
                    value={editBranch}
                    onChange={(e) => setEditBranch(e.target.value)}
                    placeholder="Branch"
                  />
                  <input
                    value={editPositions}
                    onChange={(e) => setEditPositions(e.target.value)}
                    placeholder="Positions (comma-separated)"
                  />
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as AuctionPlayerStatus)
                    }
                  >
                    <option value="REGISTERED">REGISTERED</option>
                    <option value="ELIGIBLE">ELIGIBLE</option>
                    <option value="INELIGIBLE">INELIGIBLE</option>
                    <option value="UNSOLD">UNSOLD</option>
                    <option value="RE_AUCTIONED">RE_AUCTIONED</option>
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => saveEditRow(reg.id)}
                    >
                      Save Fix
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <strong style={{ color: "#d4a038" }}>{reg.playerName}</strong>{" "}
                    <span className="muted">
                      · {reg.yearLabel} · {reg.branch} · {reg.sport}
                    </span>
                    <div style={{ fontSize: 13, marginTop: 2 }}>
                      Positions: <strong>{reg.positions.join(", ")}</strong> · Class:{" "}
                      <strong>{reg.playerClass}</strong> · Base:{" "}
                      <strong>₹{reg.basePrice.toLocaleString()}</strong> · Status:{" "}
                      <span>{reg.status}</span>
                    </div>
                  </div>

                  {isSecretary && (
                    <button
                      type="button"
                      className="nav-pill"
                      onClick={() => startEditRow(reg)}
                    >
                      Edit Entry
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
          {filteredSportRoster.length === 0 && (
            <li className="muted">No enrolled players match this filter.</li>
          )}
        </ul>
      </section>
    </div>
  );
}