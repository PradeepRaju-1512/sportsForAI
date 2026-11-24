import React, { useEffect, useState } from "react";

interface MatchItem {
  id: number;
  sportName: string;
  stage: string;
  teamA: string;
  teamB: string;
  scoreA: string;
  scoreB: string;
  status: string;
  scheduledTime: string;
  venue: string;
  resultSummary: string;
}

export default function LiveOrUpcomingPage({
  mode,
}: {
  mode: "LIVE" | "UPCOMING";
}) {
  const [liveMatches, setLiveMatches] = useState<MatchItem[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchItem[]>([]);
  const [recentResults, setRecentResults] = useState<MatchItem[]>([]);

  useEffect(() => {
    fetch("/api/live-status")
      .then((r) => r.json())
      .then((json) => {
        setLiveMatches(json.liveMatches || []);
        setUpcomingMatches(json.upcomingMatches || []);
        setRecentResults(json.recentResults || []);
      })
      .catch(console.error);
  }, [mode]);

  return (
    <div className="container">
      {liveMatches.length > 0 && (
        <section className="panel">
          <h1 className="section-heading">Live Scorecards & Active Matches</h1>
          <ul className="list-clean">
            {liveMatches.map((m) => (
              <li key={m.id} className="list-item-row">
                <div>
                  <span style={{ background: "#b91c1c", padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 8 }}>
                    LIVE
                  </span>
                  <strong>{m.sportName}</strong> · {m.stage}
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#d4a038", marginTop: 4 }}>
                    {m.teamA}: {m.scoreA} &nbsp;|&nbsp; {m.teamB}: {m.scoreB}
                  </div>
                  <div className="muted">{m.resultSummary}</div>
                </div>
                <span className="muted">{m.venue}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h2 className="section-heading">Upcoming Scheduled Matches</h2>
        {upcomingMatches.length === 0 ? (
          <p className="muted">No upcoming matches scheduled right now.</p>
        ) : (
          <ul className="list-clean">
            {upcomingMatches.map((m) => (
              <li key={m.id} className="list-item-row">
                <div>
                  <strong>{m.sportName}</strong> · {m.stage}: {m.teamA} vs {m.teamB}
                  <div className="muted">{m.venue}</div>
                </div>
                <span className="muted">{m.scheduledTime}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {liveMatches.length > 0 && recentResults.length > 0 && (
        <section className="panel">
          <h2 className="section-heading">Recent Match Results</h2>
          <ul className="list-clean">
            {recentResults.map((m) => (
              <li key={m.id} className="list-item-row">
                <div>
                  <strong>{m.sportName}</strong> · {m.stage}: {m.teamA} ({m.scoreA}) vs {m.teamB} ({m.scoreB})
                  <div className="muted">{m.resultSummary}</div>
                </div>
                <span className="muted">{m.scheduledTime}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
