import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  rollNumber: text("roll_number"),
  batch: text("batch").notNull().default("3RD"),
  branch: text("branch").notNull().default("CSE"),
  role: text("role").notNull().default("STUDENT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull().default("GENERAL"),
  isUrgentBanner: boolean("is_urgent_banner").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sportsClubs = pgTable("sports_clubs", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  groupType: text("group_type").notNull(),
  description: text("description").notNull(),
  venue: text("venue").notNull(),
  inductionOpen: boolean("induction_open").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const clubMemberships = pgTable("club_memberships", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id")
    .notNull()
    .references(() => sportsClubs.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  memberRole: text("member_role").notNull().default("MEMBER"),
  batchScope: text("batch_scope").notNull().default("ALL"),
  status: text("status").notNull().default("INDUCTED"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clubActivities = pgTable("club_activities", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id")
    .notNull()
    .references(() => sportsClubs.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(),
  targetBatch: text("target_batch").notNull(),
  categoryGender: text("category_gender").notNull(),
  scheduledLabel: text("scheduled_label").notNull(),
  venue: text("venue").notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clubId: integer("club_id").references(() => sportsClubs.id, {
    onDelete: "set null",
  }),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- SLICE 2: TOURNAMENTS, STANDINGS, MATCHES & ARCHIVE ---

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  semester: text("semester").notNull(), // ODD | EVEN
  tournamentType: text("tournament_type").notNull(), // PROTHYMOS | INTER_BATCH
  competitionFormat: text("competition_format").notNull(), // LEAGUE_KNOCKOUT | KNOCKOUT | ROUND_ROBIN
  dateRange: text("date_range").notNull(),
  structureNotes: text("structure_notes").notNull(),
  sportsIncluded: text("sports_included").notNull(), // comma-separated sport names
  status: text("status").notNull().default("UPCOMING"), // UPCOMING | CURRENT | ARCHIVED
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentTeams = pgTable("tournament_teams", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  sportName: text("sport_name").notNull(),
  teamName: text("team_name").notNull(),
  placement: text("placement"), // WINNER | RUNNER_UP_1 | RUNNER_UP_2 | NONE
  played: integer("played").notNull().default(0),
  won: integer("won").notNull().default(0),
  lost: integer("lost").notNull().default(0),
  drawn: integer("drawn").notNull().default(0),
  points: integer("points").notNull().default(0),
  nrrOrDiff: text("nrr_or_diff").notNull().default("0.00"),
});

export const teamRosterMembers = pgTable("team_roster_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => tournamentTeams.id, { onDelete: "cascade" }),
  playerName: text("player_name").notNull(),
  playerRole: text("player_role").notNull(),
  batchYear: text("batch_year").notNull(),
  branch: text("branch").notNull(),
});

export const tournamentMatches = pgTable("tournament_matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  sportName: text("sport_name").notNull(),
  stage: text("stage").notNull(), // Final | Semi-Final | Quarter-Final | Group Match
  matchOrder: integer("match_order").notNull().default(1), // Higher = later stage (Final is highest)
  teamA: text("team_a").notNull(),
  teamB: text("team_b").notNull(),
  scoreA: text("score_a").notNull().default("0"),
  scoreB: text("score_b").notNull().default("0"),
  status: text("status").notNull().default("UPCOMING"), // LIVE | UPCOMING | COMPLETED
  scheduledTime: text("scheduled_time").notNull(),
  venue: text("venue").notNull(),
  resultSummary: text("result_summary").notNull().default("Scheduled"),
  detailedBreakdown: text("detailed_breakdown").notNull().default(""),
  scorerUserId: integer("scorer_user_id").references(() => users.id),
});