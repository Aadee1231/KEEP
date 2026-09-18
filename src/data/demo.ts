import type { KeepApi } from './api';
import type {
  Commitment,
  Crew,
  CrewMember,
  FeedKind,
  ID,
  KeepResult,
  LeaderboardEntry,
  PostComment,
  Profile,
  ProofPost,
  TodayState,
  UserCommitment,
} from './types';

// ---------------------------------------------------------------------------
// In-memory demo backend. Powers the app when EXPO_PUBLIC_DATA_MODE=demo (or no
// Clerk/Supabase keys are configured) so every flow is exercisable end to end.
// ---------------------------------------------------------------------------

let seq = 1000;
const nid = () => `d${seq++}`;
const now = () => new Date().toISOString();
const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();

const CATALOGUE: Commitment[] = [
  { id: 'c1', ownerId: null, name: 'GYM', icon: 'barbell-outline', category: 'Fitness', points: 250, proofRequired: true, frequency: 'daily' },
  { id: 'c2', ownerId: null, name: 'RUN', icon: 'walk-outline', category: 'Fitness', points: 200, proofRequired: true, frequency: 'daily' },
  { id: 'c3', ownerId: null, name: '10K STEPS', icon: 'footsteps-outline', category: 'Fitness', points: 150, proofRequired: false, frequency: 'daily' },
  { id: 'c4', ownerId: null, name: 'STUDY 1 HR', icon: 'book-outline', category: 'School', points: 200, proofRequired: true, frequency: 'daily' },
  { id: 'c5', ownerId: null, name: 'STUDY 2 HR', icon: 'library-outline', category: 'School', points: 350, proofRequired: true, frequency: 'daily' },
  { id: 'c6', ownerId: null, name: 'READ', icon: 'reader-outline', category: 'Personal', points: 150, proofRequired: false, frequency: 'daily' },
  { id: 'c7', ownerId: null, name: 'UP BEFORE 8', icon: 'sunny-outline', category: 'Sleep', points: 200, proofRequired: true, frequency: 'daily' },
  { id: 'c8', ownerId: null, name: 'SLEEP BY 12', icon: 'moon-outline', category: 'Sleep', points: 150, proofRequired: false, frequency: 'daily' },
  { id: 'c9', ownerId: null, name: 'NO SOCIAL TIL NOON', icon: 'phone-portrait-outline', category: 'Productivity', points: 200, proofRequired: false, frequency: 'daily' },
  { id: 'c10', ownerId: null, name: 'SIDE PROJECT', icon: 'code-slash-outline', category: 'Productivity', points: 250, proofRequired: true, frequency: 'daily' },
  { id: 'c11', ownerId: null, name: 'DRINK WATER', icon: 'water-outline', category: 'Wellness', points: 100, proofRequired: false, frequency: 'daily' },
  { id: 'c12', ownerId: null, name: 'MEDITATE', icon: 'leaf-outline', category: 'Wellness', points: 150, proofRequired: false, frequency: 'daily' },
];

const FRIENDS: Profile[] = [
  { id: 'u_travis', username: 'travis', displayName: 'Travis', avatarUrl: 'https://i.pravatar.cc/150?img=12', onboarded: true, totalPoints: 4820, currentStreak: 6, longestStreak: 21, keepsCount: 63, weeklyWins: 5 },
  { id: 'u_maya', username: 'maya', displayName: 'Maya', avatarUrl: 'https://i.pravatar.cc/150?img=32', onboarded: true, totalPoints: 4390, currentStreak: 11, longestStreak: 14, keepsCount: 58, weeklyWins: 6 },
  { id: 'u_jon', username: 'jon', displayName: 'Jon', avatarUrl: 'https://i.pravatar.cc/150?img=53', onboarded: true, totalPoints: 3150, currentStreak: 3, longestStreak: 9, keepsCount: 40, weeklyWins: 3 },
  { id: 'u_sana', username: 'sana', displayName: 'Sana', avatarUrl: 'https://i.pravatar.cc/150?img=44', onboarded: true, totalPoints: 2900, currentStreak: 8, longestStreak: 8, keepsCount: 36, weeklyWins: 4 },
  { id: 'u_leo', username: 'leo', displayName: 'Leo', avatarUrl: 'https://i.pravatar.cc/150?img=59', onboarded: true, totalPoints: 1900, currentStreak: 2, longestStreak: 12, keepsCount: 25, weeklyWins: 2 },
];

const PROOF_SEEDS = [
  { user: 'u_travis', name: 'GYM', img: 'https://picsum.photos/seed/keep-gym/900/1150', cap: 'leg day. no excuses.', streak: 6, pts: 250, ago: 2 },
  { user: 'u_maya', name: 'READ', img: 'https://picsum.photos/seed/keep-read/900/1150', cap: 'chapter 12 done', streak: 11, pts: 150, ago: 4 },
  { user: 'u_sana', name: 'STUDY 2 HR', img: 'https://picsum.photos/seed/keep-study/900/1150', cap: null, streak: 8, pts: 350, ago: 6 },
  { user: 'u_jon', name: 'RUN', img: 'https://picsum.photos/seed/keep-run/900/1150', cap: '5k before class', streak: 3, pts: 200, ago: 22 },
  { user: 'u_leo', name: 'UP BEFORE 8', img: 'https://picsum.photos/seed/keep-morning/900/1150', cap: 'sunrise > snooze', streak: 2, pts: 200, ago: 26 },
  { user: 'u_maya', name: 'STUDY 1 HR', img: 'https://picsum.photos/seed/keep-lib/900/1150', cap: null, streak: 10, pts: 200, ago: 30 },
];

interface DemoState {
  me: Profile;
  commitments: UserCommitment[];
  crews: Crew[];
  members: Record<string, CrewMember[]>;
  posts: ProofPost[];
  comments: Record<string, PostComment[]>;
  reactions: Record<string, Record<string, string[]>>; // postId -> emoji -> userIds
  signedIn: boolean;
  pointsToday: number;
}

const EMOJIS = ['🔥', '💪', '👏', '😤'];

function freshState(): DemoState {
  const me: Profile = {
    id: 'u_me',
    username: '',
    displayName: 'You',
    avatarUrl: null,
    onboarded: false,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    keepsCount: 0,
    weeklyWins: 0,
  };
  const posts: ProofPost[] = PROOF_SEEDS.map((s, i) => ({
    id: `p${i}`,
    user: FRIENDS.find((f) => f.id === s.user)!,
    userCommitmentId: 'x',
    commitmentName: s.name,
    photoUrl: s.img,
    caption: s.cap,
    pointsAwarded: s.pts,
    streakAfter: s.streak,
    createdAt: daysAgo(0, s.ago),
    reactions: s.ago < 10 ? [{ emoji: '🔥', count: 2, mine: false }] : [],
    commentCount: s.ago === 4 ? 2 : 0,
  }));
  return {
    me,
    commitments: [],
    crews: [],
    members: {},
    posts,
    comments: { p1: [
      { id: 'cm1', user: FRIENDS[0], body: 'what are you reading?', createdAt: daysAgo(0, 3) },
      { id: 'cm2', user: FRIENDS[1], body: 'blood meridian. brutal.', createdAt: daysAgo(0, 3) },
    ]},
    reactions: {},
    signedIn: false,
    pointsToday: 0,
  };
}

export class DemoApi implements KeepApi {
  private s: DemoState = freshState();

  signInDemo(name: string) {
    this.s.signedIn = true;
    this.s.me.displayName = name;
  }
  signOut() {
    this.s = freshState();
  }

  async getMe(): Promise<Profile> {
    return { ...this.s.me };
  }

  async updateProfile(input: { username?: string; displayName?: string; avatarUri?: string | null }): Promise<Profile> {
    if (input.username !== undefined) this.s.me.username = input.username.toLowerCase();
    if (input.displayName !== undefined) this.s.me.displayName = input.displayName;
    if (input.avatarUri !== undefined) this.s.me.avatarUrl = input.avatarUri;
    return this.getMe();
  }

  async finishOnboarding() {
    this.s.me.onboarded = true;
    this.s.me.totalPoints = 400;
    this.s.me.currentStreak = 2;
    this.s.me.longestStreak = 4;
    this.s.me.keepsCount = 8;
    this.s.me.weeklyWins = 5;
  }

  async listCatalogue(): Promise<Commitment[]> {
    return CATALOGUE;
  }

  async myCommitments(): Promise<UserCommitment[]> {
    return this.s.commitments;
  }

  async addCommitment(input: { commitmentId?: ID }): Promise<void> {
    const c = CATALOGUE.find((x) => x.id === input.commitmentId);
    if (!c) return;
    if (this.s.commitments.some((uc) => uc.commitment.id === c.id)) return;
    this.s.commitments.push({
      id: nid(),
      commitment: c,
      points: c.points,
      frequency: c.frequency,
      currentStreak: 0,
      longestStreak: 0,
      keptToday: false,
      active: true,
    });
  }

  async archiveCommitment(ucId: ID): Promise<void> {
    this.s.commitments = this.s.commitments.filter((c) => c.id !== ucId);
  }

  async today(): Promise<TodayState> {
    const kept = this.s.commitments.filter((c) => c.keptToday).length;
    return {
      dateLabel: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase(),
      commitments: this.s.commitments,
      keptCount: kept,
      totalCount: this.s.commitments.length,
      pointsToday: this.s.pointsToday,
      leaderboard: this.leaderboard(),
    };
  }

  private leaderboard(): LeaderboardEntry[] {
    const all = [...FRIENDS, this.s.me];
    return all
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((u) => ({ user: u, points: u.totalPoints, streak: u.currentStreak, isMe: u.id === 'u_me' }));
  }

  async myCrews(): Promise<Crew[]> {
    return this.s.crews;
  }

  async createCrew(name: string): Promise<Crew> {
    const crew: Crew = {
      id: nid(),
      name: name.toUpperCase(),
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      memberCount: 1,
      crewStreak: 0,
      myRole: 'owner',
    };
    this.s.crews.push(crew);
    this.s.members[crew.id] = [{ user: this.s.me, role: 'owner', weekPoints: this.s.me.totalPoints }];
    return crew;
  }

  async joinCrew(inviteCode: string): Promise<Crew> {
    const code = inviteCode.trim().toUpperCase();
    let crew = this.s.crews.find((c) => c.inviteCode === code);
    if (!crew && code === 'WOLF42') {
      crew = {
        id: 'crew_wolf',
        name: 'WOLFPACK',
        inviteCode: 'WOLF42',
        memberCount: 5,
        crewStreak: 23,
        myRole: 'member',
      };
      this.s.crews.push(crew);
      this.s.members[crew.id] = [
        ...FRIENDS.map((f, i) => ({ user: f, role: (i === 0 ? 'owner' : 'member') as CrewMember['role'], weekPoints: f.totalPoints })),
        { user: this.s.me, role: 'member' as const, weekPoints: this.s.me.totalPoints },
      ];
      crew.memberCount = 6;
    }
    if (!crew) throw new Error('No crew found with that invite code.');
    if (!this.s.members[crew.id].some((m) => m.user.id === 'u_me')) {
      this.s.members[crew.id].push({ user: this.s.me, role: 'member', weekPoints: this.s.me.totalPoints });
      crew.memberCount += 1;
    }
    return crew;
  }

  async leaveCrew(crewId: ID): Promise<void> {
    this.s.crews = this.s.crews.filter((c) => c.id !== crewId);
    delete this.s.members[crewId];
  }

  async crewDetail(crewId: ID) {
    const crew = this.s.crews.find((c) => c.id === crewId);
    if (!crew) throw new Error('Crew not found');
    const members = (this.s.members[crewId] ?? []).slice().sort((a, b) => b.weekPoints - a.weekPoints);
    const ids = new Set(members.map((m) => m.user.id));
    const recentPosts = this.s.posts.filter((p) => ids.has(p.user.id)).slice(0, 12);
    return { crew, members, recentPosts };
  }

  async submitKeep(input: { userCommitmentId: ID; photoUri: string; caption?: string }): Promise<KeepResult> {
    const uc = this.s.commitments.find((c) => c.id === input.userCommitmentId);
    if (!uc) throw new Error('Commitment not found');
    if (uc.keptToday) throw new Error('Already kept today');
    uc.keptToday = true;
    uc.currentStreak += 1;
    uc.longestStreak = Math.max(uc.longestStreak, uc.currentStreak);
    const pts = uc.points;
    this.s.me.totalPoints += pts;
    this.s.me.keepsCount += 1;
    this.s.me.weeklyWins += 1;
    this.s.me.currentStreak = Math.max(this.s.me.currentStreak, uc.currentStreak);
    this.s.me.longestStreak = Math.max(this.s.me.longestStreak, uc.longestStreak);
    this.s.pointsToday += pts;
    const post: ProofPost = {
      id: nid(),
      user: { ...this.s.me },
      userCommitmentId: uc.id,
      commitmentName: uc.commitment.name,
      photoUrl: input.photoUri,
      caption: input.caption ?? null,
      pointsAwarded: pts,
      streakAfter: uc.currentStreak,
      createdAt: now(),
      reactions: [],
      commentCount: 0,
    };
    this.s.posts.unshift(post);
    return { postId: post.id, pointsAwarded: pts, newStreak: uc.currentStreak };
  }

  async feed(kind: FeedKind): Promise<ProofPost[]> {
    // friends feed: posts from crewmates + me. discover: everything.
    return this.s.posts.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async comments(postId: ID): Promise<PostComment[]> {
    return this.s.comments[postId] ?? [];
  }

  async addComment(postId: ID, body: string): Promise<PostComment> {
    const c: PostComment = { id: nid(), user: { ...this.s.me }, body, createdAt: now() };
    (this.s.comments[postId] ??= []).push(c);
    const post = this.s.posts.find((p) => p.id === postId);
    if (post) post.commentCount += 1;
    return c;
  }

  async toggleReaction(postId: ID, emoji: string): Promise<void> {
    const post = this.s.posts.find((p) => p.id === postId);
    if (!post) return;
    const mine = post.reactions.find((r) => r.emoji === emoji);
    if (mine?.mine) {
      mine.count -= 1;
      mine.mine = false;
      post.reactions = post.reactions.filter((r) => r.count > 0);
    } else if (mine) {
      mine.count += 1;
      mine.mine = true;
    } else {
      post.reactions.push({ emoji, count: 1, mine: true });
    }
  }

  async profileStats() {
    const mine = this.s.posts.filter((p) => p.user.id === 'u_me');
    return {
      proofGrid: mine,
      commitments: this.s.commitments,
      crews: this.s.crews,
    };
  }
}

export const REACTION_EMOJIS = EMOJIS;
