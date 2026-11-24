import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { BootstrapData, ClubItem, DemoUser } from "../App";

interface Props {
  data: BootstrapData | null;
  currentUser: DemoUser | null;
}

function ClubTile({ club }: { club: ClubItem }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link to={`/clubs/${club.slug}`} className="club-card">
      <div className="club-thumb-wrap">
        {!imgFailed ? (
          <img
            src={`/images/clubs/${club.slug}.png`}
            alt={club.name}
            className="club-thumb"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="club-thumb-fallback">{club.name.slice(0, 2)}</div>
        )}
      </div>
      <div className="club-title-wrap">
        <h3 className="club-name">{club.name}</h3>
      </div>
    </Link>
  );
}

export default function HomePage({ data }: Props) {
  const outdoorClubs = (data?.clubs || []).filter(
    (c) => c.groupType === "OUTDOOR_TEAM"
  );
  const indoorClubs = (data?.clubs || []).filter(
    (c) => c.groupType === "INDOOR_GAME"
  );

  return (
    <div>
      <section
        className="hero-section"
        style={{ backgroundImage: "url('/images/college.png')" }}
      >
        <div className="hero-vignette" />
        <div className="hero-content">
          <h1 className="hero-title">IIIT TRICHY SPORTS</h1>
          <p className="hero-sub">
            Clubs · Tournaments · Prothymos · Sports Archive
          </p>
        </div>
      </section>

      <main className="container">
        <section className="panel">
          <h2 className="section-heading">Announcements & Notices</h2>
          {!data ? (
            <p className="muted">Loading notices...</p>
          ) : (
            <ul className="list-clean">
              {data.notices.slice(0, 3).map((n) => (
                <li key={n.id} className="list-item-row">
                  <div>
                    <strong>{n.title}</strong>
                    <div className="muted">{n.summary}</div>
                  </div>
                  <span className="muted">{n.category}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2 className="section-heading">Outdoor & Team Sports Clubs</h2>
          <div className="grid-3">
            {outdoorClubs.map((club) => (
              <ClubTile key={club.id} club={club} />
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="section-heading">Indoor Games Clubs</h2>
          <div className="grid-3">
            {indoorClubs.map((club) => (
              <ClubTile key={club.id} club={club} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}