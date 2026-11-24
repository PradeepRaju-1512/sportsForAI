export type AuctionStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "FROZEN"
  | "LIVE"
  | "COMPLETED"
  | "PUBLISHED";

export type PlayerClass = "CLUB" | "NON_CLUB";

export type AuctionPlayerStatus =
  | "REGISTERED"
  | "ELIGIBLE"
  | "IN_AUCTION"
  | "SOLD"
  | "UNSOLD"
  | "RE_AUCTIONED"
  | "INELIGIBLE";

export interface AuctionRound {
  id: number;
  auctionId: number;
  roundNumber: number;
  name: string; // e.g. "Round 1 · Main Pool", "Round 2 · Accelerated", "Round 3 · RTM / Final"
  status: "PENDING" | "ACTIVE" | "COMPLETED";
}

export interface AuctionConfig {
  id: number;
  name: string;
  seasonYear: number;
  sports: string[]; // e.g. ["Cricket", "Football", "Volleyball", "Throwball", "Badminton"]
  status: AuctionStatus;
  registrationDeadline: string;
  clubBasePrice: number;
  nonClubBasePrice: number;
  defaultIncrement: number;
  jumpIncrement: number;
  minSquadSize: number;
  maxSquadSize: number;
  minClubPlayers: number;
  minNonClubPlayers: number;
  activeRoundId: number | null;
  activeSport: string;
  currentPlayerId: number | null;
  projectorMode: "STAGE" | "SOLD" | "UNSOLD" | "STANDINGS" | "PAUSED";
  lastUpdatedAt: string;
}

export interface AuctionRegistration {
  id: number;
  auctionId: number;
  userId: number;
  playerName: string;
  rollNumber: string;
  yearLabel: string; // "1st Year" | "2nd Year" | "3rd Year" | "4th Year" | "MTech"
  branch: string; // "CSE" | "ECE" | "MECH" | etc.
  sport: string; // Single sport per registration row
  positions: string[]; // Multiple positions allowed for this sport
  playerClass: PlayerClass; // Derived from inducted club membership for this sport
  basePrice: number;
  tier: "MARQUEE" | "TIER_1" | "TIER_2" | "UNCAPPED";
  roundId: number;
  status: AuctionPlayerStatus;
  soldToFranchiseId: number | null;
  soldPrice: number | null;
  statsSummary: string;
}

export interface FranchiseSummary {
  id: number;
  slotNumber: number; // 1..8 for keyboard hotkeys 1-8
  name: string;
  shortCode: string;
  accentColor: string;
  captainName: string;
  totalPurse: number;
  remainingPurse: number;
  squadCount: number;
  clubCount: number;
  nonClubCount: number;
  maxAllowedBid: number;
  isEligibleToBid: boolean;
  lockReason?: string;
}

export interface BidEvent {
  id: string;
  auctionId: number;
  roundId: number;
  playerId: number;
  playerName: string;
  franchiseId: number;
  franchiseName: string;
  amount: number;
  kind: "BID" | "JUMP_BID" | "UNDO" | "SOLD" | "UNSOLD" | "RTM";
  timestamp: string;
}

export interface LiveAuctionSnapshot {
  auction: AuctionConfig | null;
  rounds: AuctionRound[];
  registrations: AuctionRegistration[];
  franchises: FranchiseSummary[];
  bidHistory: BidEvent[];
  serverTime: string;
}