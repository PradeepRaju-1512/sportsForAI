import React, { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ClubPage from "./pages/ClubPage";
import OverviewPage from "./pages/OverviewPage";
import ArchivePage from "./pages/ArchivePage";
import CurrentTournamentPage from "./pages/CurrentTournamentPage";
import LiveOrUpcomingPage from "./pages/LiveOrUpcomingPage";
import AuctionPage from "./pages/AuctionPage";
import LiveAuctionPage from "./pages/LiveAuctionPage";

export interface DemoUser {
  id: number;
  name: string;
  email: string;
  rollNumber: string | null;
  batch: string;
  branch: string;
  role: string;
}

export interface NoticeItem {
  id: number;
  title: string;
  summary: string;
  category: string;
  isUrgentBanner: boolean;
}

export interface ClubItem {
  id: number;
  slug: string;
  name: string;
  groupType: string;
  description: string;
  venue: string;
  inductionOpen: boolean;
}

export interface BootstrapData {
  demoSwitcherEnabled: boolean;
  alertBanner: string | null;
  notices: NoticeItem[];
  clubs: ClubItem[];
  users: DemoUser[];
  defaultUser: DemoUser | null;
  hasLiveMatches: boolean;
  archiveYears: number[];
  auctionPlanned?: boolean;
  liveAuctionActive?: boolean;
}

export default function App() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const navigate = useNavigate();

  async function refreshBootstrap() {
    try {
      const r = await fetch("/api/bootstrap", { cache: "no-store" });
      const d: BootstrapData = await r.json();
      setData(d);
      setCurrentUser((prev) => prev || d.defaultUser);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    refreshBootstrap();
  }, []);

  const hasLive = Boolean(data?.hasLiveMatches);
  const archiveYears = data?.archiveYears || [2025, 2024];

  // Show Auction tab when an auction is planned/open/frozen/live/published
  const auctionPlanned =
    data?.auctionPlanned !== undefined ? Boolean(data.auctionPlanned) : true;
  // Show Live Auction tab when live or active
  const liveAuctionActive =
    data?.liveAuctionActive !== undefined
      ? Boolean(data.liveAuctionActive)
      : true;

  return (
    <div>
      {data?.alertBanner && (
        <div className="alert-banner">{data.alertBanner}</div>
      )}

      <header className="topbar">
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/overview">Overview</Link>

          <div className="dropdown-wrap">
            <button
              type="button"
              className="nav-pill"
              onClick={() => setArchiveOpen((o) => !o)}
            >
              Archive ▾
            </button>
            {archiveOpen && (
              <div
                className="dropdown-menu"
                onClick={() => setArchiveOpen(false)}
              >
                {archiveYears.map((yr) => (
                  <Link key={yr} to={`/archive/${yr}`}>
                    {yr}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/current-tournament">Current Tournament</Link>

          {auctionPlanned && <Link to="/auction">Auction</Link>}
          {liveAuctionActive && <Link to="/live-auction">Live Auction</Link>}

          <Link to={hasLive ? "/live" : "/upcoming"}>
            {hasLive ? "Live" : "Upcoming"}
          </Link>
        </nav>

        {data?.demoSwitcherEnabled && currentUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="muted">Role:</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const picked = data.users.find(
                  (u) => u.id === Number(e.target.value)
                );
                if (picked) setCurrentUser(picked);
              }}
            >
              {data.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <Routes>
        <Route
          path="/"
          element={<HomePage data={data} currentUser={currentUser} />}
        />
        <Route
          path="/clubs/:slug"
          element={<ClubPage currentUser={currentUser} />}
        />
        <Route
          path="/overview"
          element={<OverviewPage currentUser={currentUser} />}
        />
        <Route
          path="/archive/:year"
          element={<ArchivePage archiveYears={archiveYears} />}
        />
        <Route
          path="/current-tournament"
          element={
            <CurrentTournamentPage
              currentUser={currentUser}
              onLiveStateChange={refreshBootstrap}
            />
          }
        />
        <Route path="/live" element={<LiveOrUpcomingPage mode="LIVE" />} />
        <Route
          path="/upcoming"
          element={<LiveOrUpcomingPage mode="UPCOMING" />}
        />
        <Route
          path="/auction"
          element={
            <AuctionPage
              currentUser={currentUser}
              onNavigate={(route) => navigate(route)}
            />
          }
        />
        <Route
          path="/live-auction"
          element={
            <LiveAuctionPage
              currentUser={currentUser}
              projectorModeRoute={false}
              onNavigate={(route) => navigate(route)}
            />
          }
        />
        <Route
          path="/live-auction/projector"
          element={
            <LiveAuctionPage
              currentUser={currentUser}
              projectorModeRoute={true}
              onNavigate={(route) => navigate(route)}
            />
          }
        />
      </Routes>
    </div>
  );
}