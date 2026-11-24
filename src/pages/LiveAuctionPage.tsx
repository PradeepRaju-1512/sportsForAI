import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { DemoUser } from "../App";
import { useAuctionSync } from "../hooks/useAuctionSync";
import type { AuctionRegistration, FranchiseSummary } from "../types/auction";

export default function LiveAuctionPage({
  currentUser,
  projectorModeRoute = false,
  onNavigate,
}: {
  currentUser: DemoUser | null;
  projectorModeRoute?: boolean;
  onNavigate: (route: string) => void;
}) {
  const { snapshot, connected, error, refreshSnapshot } = useAuctionSync(1800);
  const [fullScreenProjector, setFullScreenProjector] = useState(
    projectorModeRoute
  );
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [jumpBidAmount, setJumpBidAmount] = useState("");
  const [jumpFranchiseId, setJumpFranchiseId] = useState<number | "">("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setFullScreenProjector(projectorModeRoute);
  }, [projectorModeRoute]);

  const canOperate = Boolean(
    currentUser &&
      ["AUCTION_OPERATOR", "SPORTS_SECRETARY", "FACULTY_ADVISOR"].includes(
        currentUser.role
      )
  );

  const auction = snapshot?.auction || null;
  const rounds = snapshot?.rounds || [];
  const registrations = snapshot?.registrations || [];
  const franchises = snapshot?.franchises || [];
  const bidHistory = snapshot?.bidHistory || [];

  const activePlayer: AuctionRegistration | null = useMemo(() => {
    if (!auction?.currentPlayerId) return null;
    return (
      registrations.find((p) => p.id === auction.currentPlayerId) || null
    );
  }, [auction?.currentPlayerId, registrations]);

  const currentHighestBid = useMemo(() => {
    if (!activePlayer || !auction) return 0;
    const playerBids = bidHistory.filter(
      (b) =>
        b.playerId === activePlayer.id &&
        (b.kind === "BID" || b.kind === "JUMP_BID")
    );
    if (playerBids.length === 0) return activePlayer.basePrice;
    return Math.max(...playerBids.map((b) => b.amount));
  }, [activePlayer, auction, bidHistory]);

  const leadingFranchise: FranchiseSummary | null = useMemo(() => {
    if (!activePlayer) return null;
    const lastBid = [...bidHistory]
      .reverse()
      .find(
        (b) =>
          b.playerId === activePlayer.id &&
          (b.kind === "BID" || b.kind === "JUMP_BID")
      );
    if (!lastBid) return null;
    return franchises.find((f) => f.id === lastBid.franchiseId) || null;
  }, [activePlayer, bidHistory, franchises]);

  const nextStandardBid =
    currentHighestBid + (auction?.defaultIncrement || 500);

  const sendCommand = useCallback(
    async (endpoint: string, payload: Record<string, unknown> = {}) => {
      if (!currentUser || !canOperate) return;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUserId: currentUser.id, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback(json.error || "Operator command rejected");
        return;
      }
      setFeedback(json.message || "Updated");
      await refreshSnapshot();
    },
    [currentUser, canOperate, refreshSnapshot]
  );

  const handleFranchiseBid = useCallback(
    async (franchise: FranchiseSummary) => {
      if (!activePlayer || !auction) return;
      if (!franchise.isEligibleToBid || nextStandardBid > franchise.maxAllowedBid) {
        setFeedback(
          `${franchise.name} blocked by purse/quota guardrail (Max: ₹${franchise.maxAllowedBid.toLocaleString()})`
        );
        return;
      }
      await sendCommand("/api/auction/bid", {
        playerId: activePlayer.id,
        franchiseId: franchise.id,
        amount: nextStandardBid,
        kind: "BID",
      });
    },
    [activePlayer, auction, nextStandardBid, sendCommand]
  );

  const handleNextPlayer = useCallback(async () => {
    await sendCommand("/api/auction/next-player", {
      sport: auction?.activeSport,
      roundId: auction?.activeRoundId,
    });
  }, [sendCommand, auction?.activeSport, auction?.activeRoundId]);

  const handleMarkSold = useCallback(async () => {
    if (!activePlayer || !leadingFranchise) {
      setFeedback("Need a leading franchise bid before marking SOLD.");
      return;
    }
    await sendCommand("/api/auction/outcome", {
      playerId: activePlayer.id,
      outcome: "SOLD",
      franchiseId: leadingFranchise.id,
      amount: currentHighestBid,
    });
  }, [activePlayer, leadingFranchise, currentHighestBid, sendCommand]);

  const handleMarkUnsold = useCallback(async () => {
    if (!activePlayer) return;
    await sendCommand("/api/auction/outcome", {
      playerId: activePlayer.id,
      outcome: "UNSOLD",
    });
  }, [activePlayer, sendCommand]);

  const handleUndo = useCallback(async () => {
    await sendCommand("/api/auction/undo");
  }, [sendCommand]);

  const handleTriggerRtm = useCallback(async () => {
    if (!activePlayer) return;
    await sendCommand("/api/auction/rtm", { playerId: activePlayer.id });
  }, [activePlayer, sendCommand]);

  // Keyboard shortcuts for single operator
  useEffect(() => {
    if (!canOperate) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
      ) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.key >= "1" && e.key <= "8") {
        const slot = Number(e.key);
        const f = franchises.find((item) => item.slotNumber === slot);
        if (f) {
          e.preventDefault();
          handleFranchiseBid(f);
        }
        return;
      }
      switch (e.key.toLowerCase()) {
        case "u":
          e.preventDefault();
          handleUndo();
          break;
        case "s":
          e.preventDefault();
          handleMarkSold();
          break;
        case "x":
          e.preventDefault();
          handleMarkUnsold();
          break;
        case "n":
          e.preventDefault();
          handleNextPlayer();
          break;
        case "r":
          e.preventDefault();
          handleTriggerRtm();
          break;
        case " ":
          e.preventDefault();
          sendCommand("/api/auction/projector", {
            mode:
              auction?.projectorMode === "PAUSED" ? "STAGE" : "PAUSED",
          });
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canOperate,
    franchises,
    handleFranchiseBid,
    handleUndo,
    handleMarkSold,
    handleMarkUnsold,
    handleNextPlayer,
    handleTriggerRtm,
    sendCommand,
    auction?.projectorMode,
  ]);

  if (!auction) {
    return (
      <div className="container">
        <section className="panel">
          <h1 className="section-heading">Live Auction</h1>
          <p className="muted">No live auction session is active right now.</p>
        </section>
      </div>
    );
  }

  // 16:9 Auditorium Projection View (with full operator controls accessible in drawer)
  if (fullScreenProjector) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#090a0d",
          color: "#f4efe6",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(212,160,56,0.28)",
            paddingBottom: 12,
          }}
        >
          <div>
            <strong style={{ color: "#d4a038", fontSize: 18 }}>
              {auction.name}
            </strong>{" "}
            <span className="muted">
              · {auction.activeSport} ·{" "}
              {rounds.find((r) => r.id === auction.activeRoundId)?.name ||
                "Round 1"}{" "}
              · {connected ? "LIVE SYNC" : "SYNCING"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {canOperate && (
              <button
                type="button"
                className="action-btn"
                onClick={() => setDrawerOpen((o) => !o)}
              >
                {drawerOpen ? "Hide Operator Controls" : "Operator Controls"}
              </button>
            )}
            <button
              type="button"
              className="nav-pill"
              onClick={() => {
                setFullScreenProjector(false);
                if (projectorModeRoute) onNavigate("/live-auction");
              }}
            >
              Exit Projection
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              canOperate && drawerOpen ? "1.1fr 1fr 1.1fr" : "1fr 1fr",
            gap: 24,
            margin: "20px 0",
            alignItems: "center",
          }}
        >
          {/* Left: Player Card */}
          <div className="panel" style={{ background: "#13151b" }}>
            {activePlayer ? (
              <>
                <div style={{ fontSize: 13, color: "#d4a038" }}>
                  {activePlayer.playerClass} CLASS · Base ₹
                  {activePlayer.basePrice.toLocaleString()}
                </div>
                <h2 style={{ fontSize: 32, margin: "6px 0" }}>
                  {activePlayer.playerName}
                </h2>
                <div className="muted">
                  {activePlayer.yearLabel} · {activePlayer.branch} ·{" "}
                  {activePlayer.sport}
                </div>
                <div style={{ marginTop: 10, fontSize: 15 }}>
                  Positions: <strong>{activePlayer.positions.join(", ")}</strong>
                </div>
                {activePlayer.statsSummary && (
                  <p className="muted" style={{ marginTop: 10 }}>
                    {activePlayer.statsSummary}
                  </p>
                )}
              </>
            ) : (
              <p className="muted">Waiting for next player on the block...</p>
            )}
          </div>

          {/* Center: Live Bid & Status */}
          <div
            className="panel"
            style={{ background: "#13151b", textAlign: "center" }}
          >
            <div className="muted">CURRENT BID</div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "#d4a038",
                margin: "8px 0",
              }}
            >
              ₹{currentHighestBid.toLocaleString()}
            </div>
            <div style={{ fontSize: 20 }}>
              Leading:{" "}
              <strong>
                {leadingFranchise ? leadingFranchise.name : "Opening Bid"}
              </strong>
            </div>
            {auction.projectorMode !== "STAGE" && (
              <div
                style={{
                  marginTop: 14,
                  padding: "8px 14px",
                  borderRadius: 6,
                  background: "rgba(212,160,56,0.16)",
                  color: "#d4a038",
                  fontWeight: 700,
                }}
              >
                {auction.projectorMode}
              </div>
            )}
          </div>

          {/* Right (when operator drawer open): All Operator Controls */}
          {canOperate && drawerOpen && (
            <div className="panel" style={{ background: "#13151b" }}>
              <h3 className="section-heading">Operator Controls</h3>
              {feedback && (
                <p style={{ color: "#d4a038", fontSize: 12 }}>{feedback}</p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                {franchises.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="nav-pill"
                    disabled={!f.isEligibleToBid}
                    onClick={() => handleFranchiseBid(f)}
                  >
                    [{f.slotNumber}] {f.shortCode} · ₹
                    {nextStandardBid.toLocaleString()}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="action-btn"
                  onClick={handleMarkSold}
                >
                  SOLD [S]
                </button>
                <button
                  type="button"
                  className="nav-pill"
                  onClick={handleMarkUnsold}
                >
                  UNSOLD [X]
                </button>
                <button
                  type="button"
                  className="nav-pill"
                  onClick={handleUndo}
                >
                  Undo [U]
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={handleNextPlayer}
                >
                  Next [N]
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Purse & Squad Ticker */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {franchises.map((f) => (
            <div
              key={f.id}
              style={{
                background: "#13151b",
                border:
                  leadingFranchise?.id === f.id
                    ? "1px solid #d4a038"
                    : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: 10,
              }}
            >
              <strong>{f.name}</strong>
              <div style={{ fontSize: 14, color: "#d4a038" }}>
                Purse: ₹{f.remainingPurse.toLocaleString()}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Squad: {f.squadCount}/{auction.maxSquadSize} · Max Bid: ₹
                {f.maxAllowedBid.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard Live Auction Console + Live Multi-Device View
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
            <h1 className="section-heading">Live Auction — {auction.name}</h1>
            <p className="muted">
              {connected ? "Live sync connected" : "Polling live updates"} ·
              {error ? ` (${error})` : ` Updated ${auction.lastUpdatedAt}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                setFullScreenProjector(true);
                onNavigate("/live-auction/projector");
              }}
            >
              Open 16:9 Projection View
            </button>
          </div>
        </div>

        {/* Sport & Round Switcher */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {auction.sports.map((sp) => (
            <button
              key={sp}
              type="button"
              className={auction.activeSport === sp ? "action-btn" : "nav-pill"}
              disabled={!canOperate}
              onClick={() =>
                sendCommand("/api/auction/context", { activeSport: sp })
              }
            >
              {sp}
            </button>
          ))}
          {rounds.map((rd) => (
            <button
              key={rd.id}
              type="button"
              className={
                auction.activeRoundId === rd.id ? "action-btn" : "nav-pill"
              }
              disabled={!canOperate}
              onClick={() =>
                sendCommand("/api/auction/context", { activeRoundId: rd.id })
              }
            >
              {rd.name}
            </button>
          ))}
        </div>

        {feedback && (
          <p style={{ color: "#d4a038", fontSize: 13, marginTop: 10 }}>
            {feedback}
          </p>
        )}

        {canOperate && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Operator Hotkeys: <strong>1–8</strong> Franchise Bid ·{" "}
            <strong>U / Ctrl+Z</strong> Undo · <strong>S</strong> Sold ·{" "}
            <strong>X</strong> Unsold · <strong>N</strong> Next Player ·{" "}
            <strong>R</strong> RTM · <strong>Space</strong> Freeze/Stage
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          {/* Active Player & Bid Box */}
          <div className="list-item-row" style={{ display: "block" }}>
            {activePlayer ? (
              <>
                <div style={{ fontSize: 12, color: "#d4a038" }}>
                  {activePlayer.playerClass} · Base ₹
                  {activePlayer.basePrice.toLocaleString()}
                </div>
                <h2 style={{ margin: "4px 0" }}>{activePlayer.playerName}</h2>
                <div className="muted">
                  {activePlayer.yearLabel} · {activePlayer.branch} ·{" "}
                  {activePlayer.sport}
                </div>
                <div style={{ marginTop: 6, fontSize: 13 }}>
                  Positions: <strong>{activePlayer.positions.join(", ")}</strong>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="muted">Current Bid</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#d4a038" }}>
                    ₹{currentHighestBid.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Leading:{" "}
                    <strong>
                      {leadingFranchise ? leadingFranchise.name : "None yet"}
                    </strong>
                  </div>
                </div>

                {canOperate && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <button
                      type="button"
                      className="action-btn"
                      onClick={handleMarkSold}
                    >
                      SOLD [S]
                    </button>
                    <button
                      type="button"
                      className="nav-pill"
                      onClick={handleMarkUnsold}
                    >
                      UNSOLD [X]
                    </button>
                    <button
                      type="button"
                      className="nav-pill"
                      onClick={handleUndo}
                    >
                      Undo [U]
                    </button>
                    <button
                      type="button"
                      className="nav-pill"
                      onClick={handleTriggerRtm}
                    >
                      RTM [R]
                    </button>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={handleNextPlayer}
                    >
                      Next Player [N]
                    </button>
                  </div>
                )}

                {canOperate && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 10,
                    }}
                  >
                    <select
                      value={jumpFranchiseId}
                      onChange={(e) =>
                        setJumpFranchiseId(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                    >
                      <option value="">Jump Bid Franchise...</option>
                      {franchises.map((f) => (
                        <option key={f.id} value={f.id}>
                          [{f.slotNumber}] {f.name} (Max ₹
                          {f.maxAllowedBid.toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Custom ₹ amount"
                      value={jumpBidAmount}
                      onChange={(e) => setJumpBidAmount(e.target.value)}
                      style={{ width: 130 }}
                    />
                    <button
                      type="button"
                      className="nav-pill"
                      onClick={() => {
                        if (!jumpFranchiseId || !jumpBidAmount) return;
                        sendCommand("/api/auction/bid", {
                          playerId: activePlayer.id,
                          franchiseId: jumpFranchiseId,
                          amount: Number(jumpBidAmount),
                          kind: "JUMP_BID",
                        });
                        setJumpBidAmount("");
                      }}
                    >
                      Apply Jump Bid
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="muted">No player currently on the block.</p>
                {canOperate && (
                  <button
                    type="button"
                    className="action-btn"
                    style={{ marginTop: 10 }}
                    onClick={handleNextPlayer}
                  >
                    Pull Next Player [N]
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Franchise Matrix with Purse & Quota Guardrails */}
          <div className="list-item-row" style={{ display: "block" }}>
            <h3 className="section-heading">Franchises & Purse Guardrails</h3>
            <ul className="list-clean" style={{ marginTop: 10 }}>
              {franchises.map((f) => {
                const isLead = leadingFranchise?.id === f.id;
                const locked = !f.isEligibleToBid;
                return (
                  <li
                    key={f.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      opacity: locked ? 0.55 : 1,
                    }}
                  >
                    <div>
                      <strong
                        style={{ color: isLead ? "#d4a038" : undefined }}
                      >
                        [{f.slotNumber}] {f.name}
                      </strong>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Purse: ₹{f.remainingPurse.toLocaleString()} · Squad:{" "}
                        {f.squadCount}/{auction.maxSquadSize} · Max Bid: ₹
                        {f.maxAllowedBid.toLocaleString()}
                        {f.lockReason ? ` · ${f.lockReason}` : ""}
                      </div>
                    </div>

                    {canOperate && activePlayer && (
                      <button
                        type="button"
                        className={isLead ? "action-btn" : "nav-pill"}
                        disabled={locked}
                        onClick={() => handleFranchiseBid(f)}
                      >
                        Bid ₹{nextStandardBid.toLocaleString()}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Live Bid & Sale Feed Synced Across All Logged-In Devices */}
        <div style={{ marginTop: 18 }}>
          <h3 className="section-heading">Live Auction Feed</h3>
          <ul className="list-clean" style={{ marginTop: 8 }}>
            {bidHistory.slice(0, 12).map((ev) => (
              <li key={ev.id} className="list-item-row" style={{ fontSize: 13 }}>
                <span>
                  <strong>{ev.kind}</strong> · {ev.playerName} ·{" "}
                  <strong>{ev.franchiseName}</strong> — ₹
                  {ev.amount.toLocaleString()}
                </span>
                <span className="muted">{ev.timestamp}</span>
              </li>
            ))}
            {bidHistory.length === 0 && (
              <li className="muted">No bids recorded yet.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}