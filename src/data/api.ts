import type {
  Commitment,
  CommitmentCategory,
  Crew,
  CrewMember,
  FeedKind,
  Frequency,
  ID,
  KeepResult,
  PostComment,
  Profile,
  ProfileStats,
  TodayState,
} from './types';

export interface KeepApi {
  // session / profile
  getMe(): Promise<Profile>;
  updateProfile(input: { username?: string; displayName?: string; avatarUri?: string | null }): Promise<Profile>;

  // commitments
  listCatalogue(): Promise<Commitment[]>;
  myCommitments(): Promise<import('./types').UserCommitment[]>;
  addCommitment(input: { commitmentId?: ID; name?: string; category?: CommitmentCategory; points?: number; frequency?: Frequency }): Promise<void>;
  archiveCommitment(userCommitmentId: ID): Promise<void>;
  today(): Promise<TodayState>;

  // crews
  myCrews(): Promise<Crew[]>;
  createCrew(name: string): Promise<Crew>;
  joinCrew(inviteCode: string): Promise<Crew>;
  leaveCrew(crewId: ID): Promise<void>;
  crewDetail(crewId: ID): Promise<{ crew: Crew; members: CrewMember[]; recentPosts: import('./types').ProofPost[] }>;

  // keeps / feed
  submitKeep(input: { userCommitmentId: ID; photoUri: string; caption?: string }): Promise<KeepResult>;
  feed(kind: FeedKind): Promise<import('./types').ProofPost[]>;
  comments(postId: ID): Promise<PostComment[]>;
  addComment(postId: ID, body: string): Promise<PostComment>;
  toggleReaction(postId: ID, emoji: string): Promise<void>;

  // profile
  profileStats(userId?: ID): Promise<ProfileStats>;
}
