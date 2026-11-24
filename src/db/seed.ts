import "dotenv/config";
import { eq, count } from "drizzle-orm";
import { db, pool } from "./index.js";
import {
  users,
  notices,
  sportsClubs,
  clubMemberships,
  clubActivities,
  notifications,
} from "./schema.js";

const NINE_CLUBS = [
  {
    slug: "football",
    name: "Football",
    groupType: "OUTDOOR_TEAM",
    description: "Inter-batch league, Prothymos squads, and evening ground drills.",
    venue: "Main Football Ground",
    inductionOpen: true,
    sortOrder: 1,
  },
  {
    slug: "cricket",
    name: "Cricket",
    groupType: "OUTDOOR_TEAM",
    description: "Hard-ball and turf nets, semester championships, and auction pool.",
    venue: "IIITT Cricket Ground",
    inductionOpen: true,
    sortOrder: 2,
  },
  {
    slug: "volleyball",
    name: "Volleyball",
    groupType: "OUTDOOR_TEAM",
    description: "High-intensity court sessions, rotation drills, and fest brackets.",
    venue: "Outdoor Volleyball Courts",
    inductionOpen: true,
    sortOrder: 3,
  },
  {
    slug: "kho-kho",
    name: "Kho Kho",
    groupType: "OUTDOOR_TEAM",
    description: "Agility relays, chasers/runners formations, and tournament prep.",
    venue: "Campus Track & Field",
    inductionOpen: true,
    sortOrder: 4,
  },
  {
    slug: "kabaddi",
    name: "Kabaddi",
    groupType: "OUTDOOR_TEAM",
    description: "Raid conditioning, defensive holds, and mat/ground scrimmages.",
    venue: "Kabaddi Arena",
    inductionOpen: true,
    sortOrder: 5,
  },
  {
    slug: "badminton",
    name: "Badminton",
    groupType: "INDOOR_GAME",
    description: "Singles & doubles footwork, rally ladders, and indoor court play.",
    venue: "Indoor Badminton Hall",
    inductionOpen: true,
    sortOrder: 6,
  },
  {
    slug: "table-tennis",
    name: "Table Tennis",
    groupType: "INDOOR_GAME",
    description: "Spin control, matchplay rotations, and hostel/batch challenges.",
    venue: "Student Activity Center TT Tables",
    inductionOpen: true,
    sortOrder: 7,
  },
  {
    slug: "carrom",
    name: "Carrom",
    groupType: "INDOOR_GAME",
    description: "Precision breaks, doubles boards, and semester indoor fixtures.",
    venue: "Indoor Recreation Room",
    inductionOpen: true,
    sortOrder: 8,
  },
  {
    slug: "chess",
    name: "Chess",
    groupType: "INDOOR_GAME",
    description: "Rapid & blitz arenas, opening prep, and inter-batch tournaments.",
    venue: "Seminar & Chess Lounge",
    inductionOpen: true,
    sortOrder: 9,
  },
];

async function seed() {
  const sampleUsers = [
    {
      name: "Karthik Nair",
      email: "karthik.22@iiitt.ac.in",
      rollNumber: "CS22B1012",
      batch: "4TH",
      branch: "CSE",
      role: "SPORTS_SECRETARY",
    },
    {
      name: "Dr. R. Sundaram",
      email: "sundaram@iiitt.ac.in",
      rollNumber: "FAC004",
      batch: "STAFF",
      branch: "PED",
      role: "FACULTY_ADVISOR",
    },
    {
      name: "Aditi Menon",
      email: "aditi.23@iiitt.ac.in",
      rollNumber: "EC23B1024",
      batch: "3RD",
      branch: "ECE",
      role: "CLUB_SECRETARY",
    },
    {
      name: "Rohan Verma",
      email: "rohan.24@iiitt.ac.in",
      rollNumber: "CS24B1041",
      batch: "2ND",
      branch: "CSE",
      role: "CLUB_COORDINATOR",
    },
    {
      name: "Meera Krishnan",
      email: "meera.25@iiitt.ac.in",
      rollNumber: "ME25B1018",
      batch: "1ST",
      branch: "MECH",
      role: "CLUB_MEMBER",
    },
    {
      name: "Siddharth Iyer",
      email: "siddharth.m25@iiitt.ac.in",
      rollNumber: "CS25M1005",
      batch: "MTECH",
      branch: "CSE",
      role: "CLUB_MEMBER",
    },
    {
      name: "Ananya Reddy",
      email: "ananya.25@iiitt.ac.in",
      rollNumber: "EC25B1033",
      batch: "1ST",
      branch: "ECE",
      role: "STUDENT",
    },
  ];

  for (const u of sampleUsers) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoNothing({ target: users.email });
  }

  for (const club of NINE_CLUBS) {
    await db
      .insert(sportsClubs)
      .values(club)
      .onConflictDoNothing({ target: sportsClubs.slug });
  }

  const [{ value: existingNotices }] = await db
    .select({ value: count() })
    .from(notices);

  if (existingNotices === 0) {
    await db.insert(notices).values([
      {
        title: "Semester Sports Trials & Club Inductions Open",
        summary:
          "All 9 clubs are scheduling batch-wise practice and induction sessions this week.",
        category: "TRIAL",
        isUrgentBanner: true,
      },
      {
        title: "Prothymos Registration Window Announced",
        summary:
          "Students will soon be able to enroll across multiple sports and positions with CLUB vs. NON_CLUB base prices.",
        category: "TOURNAMENT",
        isUrgentBanner: false,
      },
      {
        title: "Evening Ground & Hall Timings Updated",
        summary:
          "Outdoor team drills start at 5:00 PM; indoor hall sessions run in structured slots.",
        category: "GENERAL",
        isUrgentBanner: false,
      },
    ]);
  }

  const allClubs = await db.select().from(sportsClubs);
  const allUsers = await db.select().from(users);

  const secUser = allUsers.find((u) => u.email === "aditi.23@iiitt.ac.in");
  const coord2nd = allUsers.find((u) => u.email === "rohan.24@iiitt.ac.in");
  const member1st = allUsers.find((u) => u.email === "meera.25@iiitt.ac.in");
  const memberMtech = allUsers.find((u) => u.email === "siddharth.m25@iiitt.ac.in");
  const applicant1st = allUsers.find((u) => u.email === "ananya.25@iiitt.ac.in");

  const [{ value: existingMemberships }] = await db
    .select({ value: count() })
    .from(clubMemberships);

  if (existingMemberships === 0 && secUser && coord2nd && member1st && memberMtech && applicant1st) {
    for (const club of allClubs) {
      await db.insert(clubMemberships).values([
        {
          clubId: club.id,
          userId: secUser.id,
          memberRole: "SECRETARY",
          batchScope: "ALL",
          status: "INDUCTED",
        },
        {
          clubId: club.id,
          userId: coord2nd.id,
          memberRole: "COORDINATOR",
          batchScope: "2ND",
          status: "INDUCTED",
        },
        {
          clubId: club.id,
          userId: member1st.id,
          memberRole: "MEMBER",
          batchScope: "1ST",
          status: "INDUCTED",
        },
        {
          clubId: club.id,
          userId: memberMtech.id,
          memberRole: "MEMBER",
          batchScope: "MTECH",
          status: "INDUCTED",
        },
        {
          clubId: club.id,
          userId: applicant1st.id,
          memberRole: "MEMBER",
          batchScope: "1ST",
          status: "APPLIED",
        },
      ]);
    }
  }

  const [{ value: existingActivities }] = await db
    .select({ value: count() })
    .from(clubActivities);

  if (existingActivities === 0 && secUser) {
    for (const club of allClubs) {
      await db.insert(clubActivities).values([
        {
          clubId: club.id,
          activityType: "Practice",
          targetBatch: "4th Year",
          categoryGender: "Boys",
          scheduledLabel: "Today, 5:00 PM",
          venue: club.venue,
          createdByUserId: secUser.id,
        },
        {
          clubId: club.id,
          activityType: "Induction",
          targetBatch: "All Batches",
          categoryGender: "Open",
          scheduledLabel: "Tomorrow, 4:30 PM",
          venue: club.venue,
          createdByUserId: secUser.id,
        },
      ]);
    }
  }

  const [{ value: existingNotifs }] = await db
    .select({ value: count() })
    .from(notifications);

  const firstClub = allClubs[0];
  if (existingNotifs === 0 && member1st && firstClub) {
    await db.insert(notifications).values({
      userId: member1st.id,
      clubId: firstClub.id,
      message: `${firstClub.name}: Practice · 4th Year · Boys · Today, 5:00 PM at ${firstClub.venue}`,
      isRead: false,
    });
  }

  console.log("Slice 1 seed completed successfully.");
}

seed()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });


import "dotenv/config";
import { count } from "drizzle-orm";
import { db, pool } from "./index.js";
import {
  users,
  notices,
  sportsClubs,
  clubMemberships,
  clubActivities,
  notifications,
  tournaments,
  archiveTeams,
  archiveTeamMembers,
  tournamentMatches,
} from "./schema.js";

const NINE_CLUBS = [
  {
    slug: "football",
    name: "Football",
    groupType: "OUTDOOR_TEAM",
    description: "Inter-batch league, Prothymos squads, and evening ground drills.",
    venue: "Main Football Ground",
    inductionOpen: true,
    sortOrder: 1,
  },
  {
    slug: "cricket",
    name: "Cricket",
    groupType: "OUTDOOR_TEAM",
    description: "Hard-ball and turf nets, semester championships, and auction pool.",
    venue: "IIITT Cricket Ground",
    inductionOpen: true,
    sortOrder: 2,
  },
  {
    slug: "volleyball",
    name: "Volleyball",
    groupType: "OUTDOOR_TEAM",
    description: "High-intensity court sessions, rotation drills, and fest brackets.",
    venue: "Outdoor Volleyball Courts",
    inductionOpen: true,
    sortOrder: 3,
  },
  {
    slug: "kho-kho",
    name: "Kho Kho",
    groupType: "OUTDOOR_TEAM",
    description: "Agility relays, chasers/runners formations, and tournament prep.",
    venue: "Campus Track & Field",
    inductionOpen: true,
    sortOrder: 4,
  },
  {
    slug: "kabaddi",
    name: "Kabaddi",
    groupType: "OUTDOOR_TEAM",
    description: "Raid conditioning, defensive holds, and mat/ground scrimmages.",
    venue: "Kabaddi Arena",
    inductionOpen: true,
    sortOrder: 5,
  },
  {
    slug: "badminton",
    name: "Badminton",
    groupType: "INDOOR_GAME",
    description: "Singles & doubles footwork, rally ladders, and indoor court play.",
    venue: "Indoor Badminton Hall",
    inductionOpen: true,
    sortOrder: 6,
  },
  {
    slug: "table-tennis",
    name: "Table Tennis",
    groupType: "INDOOR_GAME",
    description: "Spin control, matchplay rotations, and hostel/batch challenges.",
    venue: "Student Activity Center TT Tables",
    inductionOpen: true,
    sortOrder: 7,
  },
  {
    slug: "carrom",
    name: "Carrom",
    groupType: "INDOOR_GAME",
    description: "Precision breaks, doubles boards, and semester indoor fixtures.",
    venue: "Indoor Recreation Room",
    inductionOpen: true,
    sortOrder: 8,
  },
  {
    slug: "chess",
    name: "Chess",
    groupType: "INDOOR_GAME",
    description: "Rapid & blitz arenas, opening prep, and inter-batch tournaments.",
    venue: "Seminar & Chess Lounge",
    inductionOpen: true,
    sortOrder: 9,
  },
];

async function seed() {
  const sampleUsers = [
    {
      name: "Karthik Nair",
      email: "karthik.22@iiitt.ac.in",
      rollNumber: "CS22B1012",
      batch: "4TH",
      branch: "CSE",
      role: "SPORTS_SECRETARY",
    },
    {
      name: "Dr. R. Sundaram",
      email: "sundaram@iiitt.ac.in",
      rollNumber: "FAC004",
      batch: "STAFF",
      branch: "PED",
      role: "FACULTY_ADVISOR",
    },
    {
      name: "Aditi Menon",
      email: "aditi.23@iiitt.ac.in",
      rollNumber: "EC23B1024",
      batch: "3RD",
      branch: "ECE",
      role: "CLUB_SECRETARY",
    },
    {
      name: "Rohan Verma",
      email: "rohan.24@iiitt.ac.in",
      rollNumber: "CS24B1041",
      batch: "2ND",
      branch: "CSE",
      role: "CLUB_COORDINATOR",
    },
    {
      name: "Arjun Das",
      email: "arjun.23@iiitt.ac.in",
      rollNumber: "CS23B1019",
      batch: "3RD",
      branch: "CSE",
      role: "MATCH_SCORER",
    },
    {
      name: "Meera Krishnan",
      email: "meera.25@iiitt.ac.in",
      rollNumber: "ME25B1018",
      batch: "1ST",
      branch: "MECH",
      role: "CLUB_MEMBER",
    },
    {
      name: "Siddharth Iyer",
      email: "siddharth.m25@iiitt.ac.in",
      rollNumber: "CS25M1005",
      batch: "MTECH",
      branch: "CSE",
      role: "CLUB_MEMBER",
    },
    {
      name: "Ananya Reddy",
      email: "ananya.25@iiitt.ac.in",
      rollNumber: "EC25B1033",
      batch: "1ST",
      branch: "ECE",
      role: "STUDENT",
    },
  ];

  for (const u of sampleUsers) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoNothing({ target: users.email });
  }

  for (const club of NINE_CLUBS) {
    await db
      .insert(sportsClubs)
      .values(club)
      .onConflictDoNothing({ target: sportsClubs.slug });
  }

  const [{ value: existingNotices }] = await db
    .select({ value: count() })
    .from(notices);

  if (existingNotices === 0) {
    await db.insert(notices).values([
      {
        title: "Semester Sports Trials & Club Inductions Open",
        summary:
          "All 9 clubs are scheduling batch-wise practice and induction sessions this week.",
        category: "TRIAL",
        isUrgentBanner: true,
      },
      {
        title: "Prothymos Registration Window Announced",
        summary:
          "Students will soon be able to enroll across multiple sports and positions with CLUB vs. NON_CLUB base prices.",
        category: "TOURNAMENT",
        isUrgentBanner: false,
      },
      {
        title: "Evening Ground & Hall Timings Updated",
        summary:
          "Outdoor team drills start at 5:00 PM; indoor hall sessions run in structured slots.",
        category: "GENERAL",
        isUrgentBanner: false,
      },
    ]);
  }

  const allClubs = await db.select().from(sportsClubs);
  const allUsers = await db.select().from(users);

  const secUser = allUsers.find((u) => u.email === "aditi.23@iiitt.ac.in");
  const coord2nd = allUsers.find((u) => u.email === "rohan.24@iiitt.ac.in");
  const scorerUser = allUsers.find((u) => u.email === "arjun.23@iiitt.ac.in");
  const member1st = allUsers.find((u) => u.email === "meera.25@iiitt.ac.in");
  const memberMtech = allUsers.find((u) => u.email === "siddharth.m25@iiitt.ac.in");
  const applicant1st = allUsers.find((u) => u.email === "ananya.25@iiitt.ac.in");

  const [{ value: existingMemberships }] = await db
    .select({ value: count() })
    .from(clubMemberships);

  if (existingMemberships === 0 && secUser && coord2nd && member1st && memberMtech && applicant1st) {
    for (const club of allClubs) {
      await db.insert(clubMemberships).values([
        {
          clubId: club.id,
          userId: secUser.id,
          memberRole: "SECRETARY",
          batchScope: "ALL",
          status: "INDUCTED",
        },
        {
          clubId: club.id,
          userId: coord2nd.id,
          memberRole: "COORDINATOR",
          batchScope: "2ND",
          status: "INDUCTED",
        },
        {
          clubId: club.id,
          userId: member1st.id,
          memberRole: "MEMBER",
          batchScope: "1ST",
          status: "INDUCTED",
        },
        {
          clubId: club.id,
          userId: memberMtech.id,
          memberRole: "MEMBER",
          batchScope: "MTECH",
          status: "INDUCTED",
        },
        {
          clubId: club.id,
          userId: applicant1st.id,
          memberRole: "MEMBER",
          batchScope: "1ST",
          status: "APPLIED",
        },
      ]);
    }
  }

  const [{ value: existingActivities }] = await db
    .select({ value: count() })
    .from(clubActivities);

  if (existingActivities === 0 && secUser) {
    for (const club of allClubs) {
      await db.insert(clubActivities).values([
        {
          clubId: club.id,
          activityType: "Practice",
          targetBatch: "4th Year",
          categoryGender: "Boys",
          scheduledLabel: "Today, 5:00 PM",
          venue: club.venue,
          createdByUserId: secUser.id,
        },
        {
          clubId: club.id,
          activityType: "Induction",
          targetBatch: "All Batches",
          categoryGender: "Open",
          scheduledLabel: "Tomorrow, 4:30 PM",
          venue: club.venue,
          createdByUserId: secUser.id,
        },
      ]);
    }
  }

  const [{ value: existingNotifs }] = await db
    .select({ value: count() })
    .from(notifications);

  const firstClub = allClubs[0];
  if (existingNotifs === 0 && member1st && firstClub) {
    await db.insert(notifications).values({
      userId: member1st.id,
      clubId: firstClub.id,
      message: `${firstClub.name}: Practice · 4th Year · Boys · Today, 5:00 PM at ${firstClub.venue}`,
      isRead: false,
    });
  }

  const [{ value: existingTournaments }] = await db
    .select({ value: count() })
    .from(tournaments);

  if (existingTournaments === 0) {
    const [currentTourney] = await db
      .insert(tournaments)
      .values({
        name: "Odd Semester Championship 2026",
        year: 2026,
        semester: "ODD",
        tournamentType: "INTRA_IIITT",
        format: "GROUP_KNOCKOUT",
        status: "LIVE",
        startDate: "2026-11-20",
        endDate: "2026-12-05",
        timetableNotes: "Evening matches 5:00 PM – 8:30 PM; indoor courts from 4:00 PM.",
        sportsJson: JSON.stringify([
          "cricket",
          "football",
          "volleyball",
          "badminton",
          "table-tennis",
          "chess",
        ]),
      })
      .returning();

    await db.insert(tournaments).values([
      {
        name: "Prothymos 2027 (Even Sem Meet)",
        year: 2027,
        semester: "EVEN",
        tournamentType: "PROTHYMOS",
        format: "GROUP_KNOCKOUT",
        status: "UPCOMING",
        startDate: "2027-02-14",
        endDate: "2027-02-23",
        timetableNotes: "Auction prior to fixtures; morning & evening knockout stages.",
        sportsJson: JSON.stringify([
          "cricket",
          "football",
          "volleyball",
          "kho-kho",
          "kabaddi",
          "badminton",
          "table-tennis",
          "carrom",
          "chess",
        ]),
      },
      {
        name: "Prothymos Championship 2025",
        year: 2025,
        semester: "EVEN",
        tournamentType: "PROTHYMOS",
        format: "GROUP_KNOCKOUT",
        status: "ARCHIVED",
        startDate: "2025-02-10",
        endDate: "2025-02-19",
        timetableNotes: "Archived 2025 Prothymos edition.",
        sportsJson: JSON.stringify(["cricket", "football", "badminton"]),
      },
      {
        name: "Autumn Sports Meet 2024",
        year: 2024,
        semester: "ODD",
        tournamentType: "INTRA_IIITT",
        format: "KNOCKOUT",
        status: "ARCHIVED",
        startDate: "2024-10-12",
        endDate: "2024-10-20",
        timetableNotes: "Archived 2024 Autumn Sports Meet.",
        sportsJson: JSON.stringify(["cricket", "football", "volleyball"]),
      },
    ]);

    const allTourneys = await db.select().from(tournaments);
    const t2025 = allTourneys.find((t) => t.year === 2025 && t.status === "ARCHIVED");
    const t2024 = allTourneys.find((t) => t.year === 2024 && t.status === "ARCHIVED");

    // Current tournament points table + matches
    const currTeams = await db
      .insert(archiveTeams)
      .values([
        {
          tournamentId: currentTourney.id,
          sportSlug: "cricket",
          name: "Trichy Titans",
          played: 2,
          won: 2,
          lost: 0,
          points: 4,
          metricLabel: "NRR +1.85",
          podiumRank: null,
        },
        {
          tournamentId: currentTourney.id,
          sportSlug: "cricket",
          name: "Cauvery Kings",
          played: 2,
          won: 1,
          lost: 1,
          points: 2,
          metricLabel: "NRR +0.42",
          podiumRank: null,
        },
        {
          tournamentId: currentTourney.id,
          sportSlug: "cricket",
          name: "Delta Dynamos",
          played: 2,
          won: 0,
          lost: 2,
          points: 0,
          metricLabel: "NRR -2.27",
          podiumRank: null,
        },
        {
          tournamentId: currentTourney.id,
          sportSlug: "football",
          name: "Kaveri United",
          played: 1,
          won: 1,
          lost: 0,
          points: 3,
          metricLabel: "GD +2",
          podiumRank: null,
        },
        {
          tournamentId: currentTourney.id,
          sportSlug: "football",
          name: "Chola Rovers",
          played: 1,
          won: 0,
          lost: 1,
          points: 0,
          metricLabel: "GD -2",
          podiumRank: null,
        },
      ])
      .returning();

    await db.insert(tournamentMatches).values([
      {
        tournamentId: currentTourney.id,
        sportSlug: "cricket",
        stage: "LEAGUE",
        stageOrder: 2,
        teamAName: "Trichy Titans",
        teamBName: "Cauvery Kings",
        status: "LIVE",
        scoreSummary: "Trichy Titans 94/3 (11.2 ov) vs Cauvery Kings",
        resultText: "In Progress",
        breakdownJson: JSON.stringify({
          venue: "IIITT Cricket Ground",
          topPerformers: ["R. Verma 41*(26)", "K. Nair 2/18"],
          notes: "Powerplay & middle overs underway.",
        }),
        scheduledLabel: "Today · Live Now",
        scorerUserId: scorerUser?.id || null,
      },
      {
        tournamentId: currentTourney.id,
        sportSlug: "cricket",
        stage: "OPENING",
        stageOrder: 1,
        teamAName: "Trichy Titans",
        teamBName: "Delta Dynamos",
        status: "COMPLETED",
        scoreSummary: "Trichy Titans 148/5 (15 ov) def. Delta Dynamos 112/8",
        resultText: "Trichy Titans won by 36 runs",
        breakdownJson: JSON.stringify({
          venue: "IIITT Cricket Ground",
          topPerformers: ["R. Verma 58(34)", "A. Menon 3/14"],
          notes: "Opening fixture completed.",
        }),
        scheduledLabel: "22 Nov 2026",
        scorerUserId: scorerUser?.id || null,
      },
      {
        tournamentId: currentTourney.id,
        sportSlug: "football",
        stage: "OPENING",
        stageOrder: 1,
        teamAName: "Kaveri United",
        teamBName: "Chola Rovers",
        status: "COMPLETED",
        scoreSummary: "Kaveri United 3 - 1 Chola Rovers",
        resultText: "Kaveri United won by 2 goals",
        breakdownJson: JSON.stringify({
          venue: "Main Football Ground",
          topPerformers: ["S. Iyer (2 Goals, 1 Assist)"],
          notes: "Full-time 70 mins.",
        }),
        scheduledLabel: "21 Nov 2026",
        scorerUserId: scorerUser?.id || null,
      },
    ]);

    if (t2025) {
      const [win25, ru1_25, ru2_25] = await db
        .insert(archiveTeams)
        .values([
          {
            tournamentId: t2025.id,
            sportSlug: "cricket",
            name: "Trichy Titans",
            played: 4,
            won: 4,
            lost: 0,
            points: 8,
            metricLabel: "NRR +2.10",
            podiumRank: 1,
          },
          {
            tournamentId: t2025.id,
            sportSlug: "cricket",
            name: "Cauvery Kings",
            played: 4,
            won: 2,
            lost: 2,
            points: 4,
            metricLabel: "NRR +0.35",
            podiumRank: 2,
          },
          {
            tournamentId: t2025.id,
            sportSlug: "cricket",
            name: "Pallava Strikers",
            played: 4,
            won: 1,
            lost: 3,
            points: 2,
            metricLabel: "NRR -0.80",
            podiumRank: 3,
          },
        ])
        .returning();

      if (win25 && ru1_25 && ru2_25) {
        await db.insert(archiveTeamMembers).values([
          {
            teamId: win25.id,
            playerName: "Karthik Nair",
            roleInTeam: "Captain / All-Rounder",
            yearBatch: "3RD",
            branch: "CSE",
          },
          {
            teamId: win25.id,
            playerName: "Aditi Menon",
            roleInTeam: "Top-Order Batter",
            yearBatch: "2ND",
            branch: "ECE",
          },
          {
            teamId: ru1_25.id,
            playerName: "Rohan Verma",
            roleInTeam: "Captain / Pace Bowler",
            yearBatch: "1ST",
            branch: "CSE",
          },
          {
            teamId: ru2_25.id,
            playerName: "Siddharth Iyer",
            roleInTeam: "Wicketkeeper / Batter",
            yearBatch: "MTECH",
            branch: "CSE",
          },
        ]);
      }

      // Matches ordered Final (highest stageOrder) down to Opening (lowest stageOrder)
      await db.insert(tournamentMatches).values([
        {
          tournamentId: t2025.id,
          sportSlug: "cricket",
          stage: "FINAL",
          stageOrder: 30,
          teamAName: "Trichy Titans",
          teamBName: "Cauvery Kings",
          status: "COMPLETED",
          scoreSummary: "Trichy Titans 162/4 def. Cauvery Kings 145/9",
          resultText: "Trichy Titans won the Final by 17 runs",
          breakdownJson: JSON.stringify({
            playerOfMatch: "Karthik Nair (64* & 2/21)",
            venue: "IIITT Cricket Ground",
          }),
          scheduledLabel: "19 Feb 2025",
          scorerUserId: scorerUser?.id || null,
        },
        {
          tournamentId: t2025.id,
          sportSlug: "cricket",
          stage: "SEMIFINAL",
          stageOrder: 20,
          teamAName: "Cauvery Kings",
          teamBName: "Pallava Strikers",
          status: "COMPLETED",
          scoreSummary: "Cauvery Kings 139/6 def. Pallava Strikers 131/10",
          resultText: "Cauvery Kings won Semifinal by 8 runs",
          breakdownJson: JSON.stringify({
            playerOfMatch: "Rohan Verma (3/19)",
            venue: "IIITT Cricket Ground",
          }),
          scheduledLabel: "17 Feb 2025",
          scorerUserId: scorerUser?.id || null,
        },
        {
          tournamentId: t2025.id,
          sportSlug: "cricket",
          stage: "OPENING",
          stageOrder: 10,
          teamAName: "Trichy Titans",
          teamBName: "Pallava Strikers",
          status: "COMPLETED",
          scoreSummary: "Trichy Titans 154/3 def. Pallava Strikers 109/7",
          resultText: "Trichy Titans won Opening Match by 45 runs",
          breakdownJson: JSON.stringify({
            playerOfMatch: "Aditi Menon (71)",
            venue: "IIITT Cricket Ground",
          }),
          scheduledLabel: "11 Feb 2025",
          scorerUserId: scorerUser?.id || null,
        },
      ]);
    }

    if (t2024) {
      const [win24, ru1_24, ru2_24] = await db
        .insert(archiveTeams)
        .values([
          {
            tournamentId: t2024.id,
            sportSlug: "football",
            name: "Chola Rovers",
            played: 3,
            won: 3,
            lost: 0,
            points: 9,
            metricLabel: "GD +7",
            podiumRank: 1,
          },
          {
            tournamentId: t2024.id,
            sportSlug: "football",
            name: "Kaveri United",
            played: 3,
            won: 2,
            lost: 1,
            points: 6,
            metricLabel: "GD +2",
            podiumRank: 2,
          },
          {
            tournamentId: t2024.id,
            sportSlug: "football",
            name: "Rockfort XI",
            played: 3,
            won: 1,
            lost: 2,
            points: 3,
            metricLabel: "GD -3",
            podiumRank: 3,
          },
        ])
        .returning();

      if (win24 && ru1_24 && ru2_24) {
        await db.insert(archiveTeamMembers).values([
          {
            teamId: win24.id,
            playerName: "Siddharth Iyer",
            roleInTeam: "Captain / Striker",
            yearBatch: "MTECH",
            branch: "CSE",
          },
          {
            teamId: ru1_24.id,
            playerName: "Karthik Nair",
            roleInTeam: "Midfielder",
            yearBatch: "2ND",
            branch: "CSE",
          },
          {
            teamId: ru2_24.id,
            playerName: "Aditi Menon",
            roleInTeam: "Defender",
            yearBatch: "1ST",
            branch: "ECE",
          },
        ]);
      }

      await db.insert(tournamentMatches).values([
        {
          tournamentId: t2024.id,
          sportSlug: "football",
          stage: "FINAL",
          stageOrder: 20,
          teamAName: "Chola Rovers",
          teamBName: "Kaveri United",
          status: "COMPLETED",
          scoreSummary: "Chola Rovers 2 - 1 Kaveri United",
          resultText: "Chola Rovers won the Final 2-1",
          breakdownJson: JSON.stringify({
            playerOfMatch: "Siddharth Iyer (2 Goals)",
            venue: "Main Football Ground",
          }),
          scheduledLabel: "20 Oct 2024",
          scorerUserId: scorerUser?.id || null,
        },
        {
          tournamentId: t2024.id,
          sportSlug: "football",
          stage: "OPENING",
          stageOrder: 10,
          teamAName: "Chola Rovers",
          teamBName: "Rockfort XI",
          status: "COMPLETED",
          scoreSummary: "Chola Rovers 4 - 0 Rockfort XI",
          resultText: "Chola Rovers won Opening Match 4-0",
          breakdownJson: JSON.stringify({
            playerOfMatch: "Siddharth Iyer (Hat-trick)",
            venue: "Main Football Ground",
          }),
          scheduledLabel: "12 Oct 2024",
          scorerUserId: scorerUser?.id || null,
        },
      ]);
    }

    void currTeams;
  }

  console.log("Slice 1 + Slice 2 seed completed successfully.");
}

seed()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });