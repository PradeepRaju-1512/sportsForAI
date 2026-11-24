import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { DemoUser } from "../App";

interface ClubDetail {
  id: number;
  slug: string;
  name: string;
  groupType: string;
  description: string;
  venue: string;
}

interface ActivityRow {
  id: number;
  activityType: string;
  targetBatch: string;
  categoryGender: string;
  scheduledLabel: string;
  venue: string;
}

interface MembershipRow {
  id: number;
  userId: number;
  memberRole: string;
  batchScope: string;
  status: string;
  userName: string;
  userEmail: string;
  userBatch: string;
  userBranch: string;
  userRoll: string | null;
}

interface NotifRow {
  id: number;
  message: string;
  createdAt: string;
}

export default function ClubPage({ currentUser }: { currentUser: DemoUser | null }) {
  const { slug } = useParams<{ slug: string }>();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [myNotifs, setMyNotifs] = useState<NotifRow[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const [activityType, setActivityType] = useState("Practice");
  const [customActivityText, setCustomActivityText] = useState("");
  const [targetBatch, setTargetBatch] = useState("4th Year");
  const [categoryGender, setCategoryGender] = useState("Boys");
  const [scheduledLabel, setScheduledLabel] = useState("Today, 5:00 PM");
  const [venue, setVenue] = useState("");

  async function loadClub() {
    if (!slug) return;
    const res = await fetch(`/api/clubs/${slug}`);
    if (!res.ok) return;
    const json = await res.json();
    setClub(json.club);
    setActivities(json.activities || []);
    setMemberships(json.memberships || []);
    if (!venue && json.club?.venue) {
      setVenue(json.club.venue);
    }
  }

  async function loadNotifs() {
    if (!currentUser) return;
    const res = await fetch(`/api/notifications?userId=${currentUser.id}`);
    if (!res.ok) return;
    const json = await res.json();
    setMyNotifs(json.notifications || []);
  }

  useEffect(() => {
    loadClub();
  }, [slug]);

  useEffect(() => {
    loadNotifs();
  }, [currentUser?.id, activities.length]);

  const canManage =
    currentUser &&
    (["SPORTS_SECRETARY", "FACULTY_ADVISOR", "CLUB_SECRETARY", "CLUB_COORDINATOR"].includes(
      currentUser.role
    ) ||
      memberships.some(
        (m) =>
          m.userId === currentUser.id &&
          ["SECRETARY", "COORDINATOR"].includes(m.memberRole)
      ));

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || !currentUser) return;
    setStatusMsg("");
    const res = await fetch(`/api/clubs/${slug}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorUserId: currentUser.id,
        activityType,
        customActivityText,
        targetBatch,
        categoryGender,
        scheduledLabel,
        venue,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatusMsg(json.error || "Could not post activity");
      return;
    }
    setStatusMsg(`Activity posted & notified ${json.notifiedCount} member(s).`);
    setCustomActivityText("");
    await loadClub();
    await loadNotifs();
  }

  async function handleApplyInduction() {
    if (!slug || !currentUser) return;
    const res = await fetch(`/api/clubs/${slug}/induction-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    if (res.ok) {
      setStatusMsg("Induction request submitted for approval.");
      await loadClub();
    }
  }

  async function handleStatusChange(membershipId: number, status: string) {
    if (!currentUser) return;
    const res = await fetch(`/api/memberships/${membershipId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorUserId: currentUser.id, status }),
    });
    if (res.ok) {
      await loadClub();
    }
  }

  if (!club) {
    return (
      <div className="container">
        <p className="muted">Loading club...</p>
      </div>
    );
  }

  const secretary = memberships.find((m) => m.memberRole === "SECRETARY");
  const coordinators = memberships.filter((m) => m.memberRole === "COORDINATOR");
  const inductedMembers = memberships.filter(
    (m) => m.memberRole === "MEMBER" && m.status === "INDUCTED"
  );
  const pendingApplicants = memberships.filter((m) => m.status === "APPLIED");

  return (
    <div className="container">
      <div style={{ marginBottom: 14 }}>
        <Link to="/" className="muted">
          ← Back to IIIT TRICHY SPORTS
        </Link>
      </div>

      <section className="panel">
        <h1 className="club-name" style={{ fontSize: "2rem" }}>
          {club.name} Club
        </h1>
        <p className="muted">{club.description}</p>

        <h2 className="section-heading" style={{ marginTop: 20 }}>
          Upcoming Activities
        </h2>
        <ul className="list-clean">
          {activities.map((a) => (
            <li key={a.id} className="list-item-row">
              <div>
                <strong>{a.activityType}</strong> · {a.targetBatch} · {a.categoryGender}
              </div>
              <div className="muted">
                {a.scheduledLabel} · {a.venue}
              </div>
            </li>
          ))}
        </ul>

        {canManage && (
          <form onSubmit={handleAddActivity} style={{ marginTop: 18 }}>
            <h3 className="club-name" style={{ fontSize: "0.95rem" }}>
              Schedule Activity & Notify Club Members
            </h3>
            <div className="form-grid">
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
              >
                <option value="Practice">Practice</option>
                <option value="Induction">Induction</option>
                <option value="Meeting">Meeting</option>
                <option value="Other">Other (Custom)</option>
              </select>

              {activityType === "Other" && (
                <input
                  type="text"
                  placeholder="Enter custom activity"
                  value={customActivityText}
                  onChange={(e) => setCustomActivityText(e.target.value)}
                  required
                />
              )}

              <select
                value={targetBatch}
                onChange={(e) => setTargetBatch(e.target.value)}
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="MTech">MTech</option>
                <option value="All Batches">All Batches</option>
              </select>

              <select
                value={categoryGender}
                onChange={(e) => setCategoryGender(e.target.value)}
              >
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
                <option value="Open">Open</option>
              </select>

              <input
                type="text"
                placeholder="When (e.g. Today, 5:00 PM)"
                value={scheduledLabel}
                onChange={(e) => setScheduledLabel(e.target.value)}
              />

              <input
                type="text"
                placeholder="Venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />

              <button type="submit" className="action-btn">
                Post & Notify
              </button>
            </div>
          </form>
        )}

        {statusMsg && (
          <p style={{ color: "#d4a038", marginTop: 10, fontSize: 13 }}>
            {statusMsg}
          </p>
        )}
      </section>

      <section className="panel">
        <h2 className="section-heading">Club Secretary</h2>
        {secretary ? (
          <div className="list-item-row">
            <strong>{secretary.userName}</strong>
            <span className="muted">
              {secretary.userBatch} · {secretary.userBranch}
            </span>
          </div>
        ) : (
          <p className="muted">Not assigned yet.</p>
        )}

        <h2 className="section-heading" style={{ marginTop: 22 }}>
          Year-Wise Club Coordinators
        </h2>
        <ul className="list-clean">
          {coordinators.map((c) => (
            <li key={c.id} className="list-item-row">
              <strong>{c.userName}</strong>
              <span className="muted">
                Batch Scope: {c.batchScope} · {c.userBranch}
              </span>
            </li>
          ))}
        </ul>

        <h2 className="section-heading" style={{ marginTop: 22 }}>
          Club Members ({inductedMembers.length})
        </h2>
        <ul className="list-clean">
          {inductedMembers.map((m) => (
            <li key={m.id} className="list-item-row">
              <span>{m.userName}</span>
              <span className="muted">
                {m.userBatch} · {m.userBranch}
              </span>
            </li>
          ))}
        </ul>

        {currentUser &&
          !memberships.some((m) => m.userId === currentUser.id) && (
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="action-btn"
                onClick={handleApplyInduction}
              >
                Apply for Club Induction
              </button>
            </div>
          )}

        {canManage && pendingApplicants.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 className="club-name" style={{ fontSize: "0.95rem" }}>
              Pending Induction Applications
            </h3>
            <ul className="list-clean">
              {pendingApplicants.map((p) => (
                <li key={p.id} className="list-item-row">
                  <span>
                    {p.userName} ({p.userBatch} · {p.userBranch})
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => handleStatusChange(p.id, "INDUCTED")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="nav-pill"
                      onClick={() => handleStatusChange(p.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="section-heading">My Club Notifications</h2>
        {myNotifs.length === 0 ? (
          <p className="muted">No notifications for the active role yet.</p>
        ) : (
          <ul className="list-clean">
            {myNotifs.map((n) => (
              <li key={n.id} className="list-item-row">
                <span>{n.message}</span>
                <span className="muted">Unread/Recent</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}