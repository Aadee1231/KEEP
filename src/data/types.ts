export type ID = string;

export interface Profile {
  id: ID;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  onboarded: boolean;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  keepsCount: number;
  weeklyWins: number; // keeps in the last 7 days
}

export type CrewRole = 'owner' | 'member';

export interface Crew {
  id: ID;
  name: string;
  inviteCode: string;
  memberCount: number;
  crewStreak: number;
  myRole?: CrewRole;
}

export interface CrewMember {
  user: Profile;
  role: CrewRole;
  weekPoints: number;
}

export type CommitmentCategory =
  | 'Fitness'
  | 'School'
  | 'Productivity'
  | 'Wellness'
  | 'Sleep'
  | 'Personal';

export type Frequency = 'daily' | 'weekdays' | 'weekly';

export interface Commitment {
  id: ID;
  ownerId: ID | null; // null = curated catalogue
  name: string;
  icon: string; // ionicon name
  category: CommitmentCategory;
  points: number;
  proofRequired: boolean;
  frequency: Frequency;
}

export interface UserCommitment {
  id: ID;
  commitment: Commitment;
  points: number;
  frequency: Frequency;
  currentStreak: number;
  longestStreak: number;
  keptToday: boolean;
  active: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface ProofPost {
  id: ID;
  user: Profile;
  userCommitmentId: ID;
  commitmentName: string;
  photoUrl: string;
  caption: string | null;
  pointsAwarded: number;
  streakAfter: number;
  createdAt: string; // ISO
  reactions: Reaction[];
  commentCount: number;
}

export interface PostComment {
  id: ID;
  user: Profile;
  body: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  user: Profile;
  points: number;
  streak: number;
  isMe: boolean;
}

export interface TodayState {
  dateLabel: string;
  commitments: UserCommitment[];
  keptCount: number;
  totalCount: number;
  pointsToday: number;
  leaderboard: LeaderboardEntry[];
}

export interface KeepResult {
  postId: ID;
  pointsAwarded: number;
  newStreak: number;
}

export interface ProfileStats {
  proofGrid: ProofPost[];
  commitments: UserCommitment[];
  crews: Crew[];
}

export type FeedKind = 'friends' | 'discover';
