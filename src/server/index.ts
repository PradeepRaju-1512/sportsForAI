import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { asc, desc, eq, and } from "drizzle-orm";
import { db, pool } from "../db/index.js";
import {
  users,
  notices,
  sportsClubs,
  clubMemberships,
  clubActivities,
  notifications,
} from "../db/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const DEMO_SWITCHER_ENABLED = process.env.ENABLE_DEMO_SWITCHER !== "false";

function capToFiveWords(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 5).join(" ");
}

function canManageClub(
  role: string,
  membershipRole?: string
): boolean {
  const elevated = ["SPORTS_SECRETARY", "FACULTY_ADVISOR"];
  if (elevated.includes(role)) return true;
  return ["CLUB_SECRETARY", "CLUB_COORDINATOR"].includes(role) ||
    ["SECRETARY", "COORDINATOR"].includes(membershipRole || "");
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      ok: true,
      demoSwitcherEnabled: DEMO_SWITCHER_ENABLED,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/bootstrap", async (_req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(asc(users.id));
    const allNotices = await db
      .select()
      .from(notices)
      .orderBy(desc(notices.createdAt), desc(notices.id));
    const clubs = await db
      .select()
      .from(sportsClubs)
      .orderBy(asc(sportsClubs.sortOrder), asc(sportsClubs.id));

    const urgentNotice = allNotices.find((n) => n.isUrgentBanner);
    const alertBanner = urgentNotice
      ? capToFiveWords(urgentNotice.title)
      : null;

    res.json({
      demoSwitcherEnabled: DEMO_SWITCHER_ENABLED,
      alertBanner,
      notices: allNotices,
      clubs,
      users: allUsers,
      defaultUser: allUsers[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/clubs/:slug", async (req, res) => {
  try {
    const [club] = await db
      .select()
      .from(sportsClubs)
      .where(eq(sportsClubs.slug, req.params.slug));

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    const activities = await db
      .select()
      .from(clubActivities)
      .where(eq(clubActivities.clubId, club.id))
      .orderBy(desc(clubActivities.id));

    const membershipsRaw = await db
      .select({
        id: clubMemberships.id,
        clubId: clubMemberships.clubId,
        userId: clubMemberships.userId,
        memberRole: clubMemberships.memberRole,
        batchScope: clubMemberships.batchScope,
        status: clubMemberships.status,
        userName: users.name,
        userEmail: users.email,
        userBatch: users.batch,
        userBranch: users.branch,
        userRoll: users.rollNumber,
      })
      .from(clubMemberships)
      .innerJoin(users, eq(clubMemberships.userId, users.id))
      .where(eq(clubMemberships.clubId, club.id))
      .orderBy(asc(clubMemberships.id));

    res.json({
      club,
      activities,
      memberships: membershipsRaw,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/clubs/:slug/activities", async (req, res) => {
  try {
    const {
      actorUserId,
      activityType,
      customActivityText,
      targetBatch,
      categoryGender,
      scheduledLabel,
      venue,
    } = req.body;

    const [club] = await db
      .select()
      .from(sportsClubs)
      .where(eq(sportsClubs.slug, req.params.slug));

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    const [actor] = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(actorUserId)));

    if (!actor) {
      return res.status(401).json({ error: "Active user required" });
    }

    const [actorMembership] = await db
      .select()
      .from(clubMemberships)
      .where(
        and(
          eq(clubMemberships.clubId, club.id),
          eq(clubMemberships.userId, actor.id)
        )
      );

    if (!canManageClub(actor.role, actorMembership?.memberRole)) {
      return res
        .status(403)
        .json({ error: "Only Club Secretary or Club Coordinator can post activities" });
    }

    const resolvedType =
      activityType === "Other" && customActivityText?.trim()
        ? customActivityText.trim()
        : (activityType || "Practice").trim();

    const [created] = await db
      .insert(clubActivities)
      .values({
        clubId: club.id,
        activityType: resolvedType,
        targetBatch: targetBatch || "All Batches",
        categoryGender: categoryGender || "Open",
        scheduledLabel: (scheduledLabel || "Today, 5:00 PM").trim(),
        venue: (venue || club.venue).trim(),
        createdByUserId: actor.id,
      })
      .returning();

    const clubRoster = await db
      .select()
      .from(clubMemberships)
      .where(eq(clubMemberships.clubId, club.id));

    const targets = clubRoster.filter((m) =>
      resolvedType.toLowerCase() === "induction"
        ? m.status === "INDUCTED" || m.status === "APPLIED"
        : m.status === "INDUCTED"
    );

    const notifText = `${club.name}: ${resolvedType} · ${created.targetBatch} · ${created.categoryGender} · ${created.scheduledLabel} (${created.venue})`;

    if (targets.length > 0) {
      await db.insert(notifications).values(
        targets.map((t) => ({
          userId: t.userId,
          clubId: club.id,
          message: notifText,
          isRead: false,
        }))
      );
    }

    res.status(201).json({ activity: created, notifiedCount: targets.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/clubs/:slug/induction-apply", async (req, res) => {
  try {
    const { userId } = req.body;
    const [club] = await db
      .select()
      .from(sportsClubs)
      .where(eq(sportsClubs.slug, req.params.slug));

    if (!club) return res.status(404).json({ error: "Club not found" });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(userId)));

    if (!user) return res.status(404).json({ error: "User not found" });

    const [existing] = await db
      .select()
      .from(clubMemberships)
      .where(
        and(
          eq(clubMemberships.clubId, club.id),
          eq(clubMemberships.userId, user.id)
        )
      );

    if (existing) {
      return res.json({ membership: existing });
    }

    const [created] = await db
      .insert(clubMemberships)
      .values({
        clubId: club.id,
        userId: user.id,
        memberRole: "MEMBER",
        batchScope: user.batch,
        status: "APPLIED",
      })
      .returning();

    res.status(201).json({ membership: created });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.patch("/api/memberships/:id/status", async (req, res) => {
  try {
    const { actorUserId, status } = req.body;
    const [actor] = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(actorUserId)));

    if (!actor || !canManageClub(actor.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [updated] = await db
      .update(clubMemberships)
      .set({ status })
      .where(eq(clubMemberships.id, Number(req.params.id)))
      .returning();

    res.json({ membership: updated });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/notifications", async (req, res) => {
  try {
    const userId = Number(req.query.userId || 0);
    if (!userId) return res.json({ notifications: [] });

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.id));

    res.json({ notifications: list });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const clientDist = path.resolve(__dirname, "../client");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);