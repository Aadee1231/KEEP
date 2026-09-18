import { SupabaseClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import type { KeepApi } from './api';
import type {
  Commitment,
  CommitmentCategory,
  Crew,
  CrewMember,
  FeedKind,
  Frequency,
  ID,
  KeepResult,
  LeaderboardEntry,
  PostComment,
  Profile,
  ProfileStats,
  ProofPost,
  Reaction,
  TodayState,
  UserCommitment,
} from './types';

const PROOF_BUCKET = 'proofs';
const AVATAR_BUCKET = 'avatars';

type Row = any;

function toProfile(r: Row, stats?: Partial<Profile>): Profile {
  return {
    id: r.id,
    username: r.username ?? '',
    displayName: r.display_name || r.username || '',
    avatarUrl: r.avatar_url ?? null,
    onboarded: !!r.onboarded,
    totalPoints: stats?.totalPoints ?? 0,
    currentStreak: stats?.currentStreak ?? 0,
    longestStreak: stats?.longestStreak ?? 0,
    keepsCount: stats?.keepsCount ?? 0,
    weeklyWins: stats?.weeklyWins ?? 0,
  };
}

function toCommitment(r: Row): Commitment {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    icon: r.icon ?? 'checkbox-outline',
    category: r.category as CommitmentCategory,
    points: r.points,
    proofRequired: r.proof_required,
    frequency: r.frequency as Frequency,
  };
}

function toUserCommitment(r: Row): UserCommitment {
  return {
    id: r.id,
    commitment: toCommitment(r.commitments),
    points: r.points,
    frequency: r.frequency,
    currentStreak: r.current_streak,
    longestStreak: r.longest_streak,
    keptToday: r.last_kept_on === new Date().toISOString().slice(0, 10),
    active: r.active,
  };
}

function toPost(r: Row, publicUrl: (path: string) => string): ProofPost {
  const reactions: Reaction[] = (r.reaction_summary ?? []).map((x: Row) => ({
    emoji: x.emoji,
    count: x.count,
    mine: x.mine,
  }));
  return {
    id: r.id,
    user: toProfile(r.profiles),
    userCommitmentId: r.user_commitment_id,
    commitmentName: r.user_commitments?.commitments?.name ?? 'KEEP',
    photoUrl: publicUrl(r.photo_path),
    caption: r.caption,
    pointsAwarded: r.points_awarded,
    streakAfter: r.streak_after ?? 0,
    createdAt: r.created_at,
    reactions,
    commentCount: r.comment_count ?? 0,
  };
}

export class SupabaseApi implements KeepApi {
  constructor(
    private sb: SupabaseClient,
    private clerkUser: { id: string; fullName?: string | null; imageUrl?: string | null },
  ) {}

  private meId: ID | null = null;

  private async myId(): Promise<ID> {
    if (this.meId) return this.meId;
    const { data, error } = await this.sb
      .from('profiles')
      .select('id')
      .eq('clerk_id', this.clerkUser.id)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      this.meId = data.id;
      return data.id;
    }
    // First sign-in: create the shell profile; onboarding completes it.
    const { data: created, error: e2 } = await this.sb
      .from('profiles')
      .insert({
        clerk_id: this.clerkUser.id,
        username: `user_${this.clerkUser.id.slice(-10)}`.toLowerCase(),
        display_name: this.clerkUser.fullName ?? '',
        avatar_url: this.clerkUser.imageUrl ?? null,
      })
      .select('id')
      .single();
    if (e2) throw e2;
    this.meId = created.id;
    return created.id;
  }

  private publicUrl(path: string): string {
    return this.sb.storage.from(PROOF_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  private async upload(uri: string, bucket: string): Promise<string> {
    const ext = (uri.split('.').pop() ?? 'jpg').split('?')[0];
    const path = `${this.clerkUser.id}/${Date.now()}.${ext}`;
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const { error } = await this.sb.storage
      .from(bucket)
      .upload(path, decode(base64), { contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}` });
    if (error) throw error;
    return path;
  }

  async getMe(): Promise<Profile> {
    const id = await this.myId();
    const { data, error } = await this.sb.from('profiles').select('*').eq('id', id).single();
    if (error) throw error;
    return toProfile(data, await this.selfStats(id));
  }

  private async selfStats(id: ID) {
    const [points, keeps, ucs] = await Promise.all([
      this.sb.from('point_events').select('points, created_at').eq('user_id', id),
      this.sb.from('proof_posts').select('id', { count: 'exact', head: true }).eq('user_id', id),
      this.sb
        .from('user_commitments')
        .select('current_streak, longest_streak')
        .eq('user_id', id)
        .eq('active', true),
    ]);
    const events = points.data ?? [];
    const week = events.filter((e: Row) => Date.now() - new Date(e.created_at).getTime() < 7 * 864e5);
    const rows = ucs.data ?? [];
    return {
      totalPoints: events.reduce((s: number, e: Row) => s + e.points, 0),
      keepsCount: keeps.count ?? 0,
      weeklyWins: week.length,
      currentStreak: rows.reduce((m: number, r: Row) => Math.max(m, r.current_streak), 0),
      longestStreak: rows.reduce((m: number, r: Row) => Math.max(m, r.longest_streak), 0),
    };
  }

  async updateProfile(input: { username?: string; displayName?: string; avatarUri?: string | null }): Promise<Profile> {
    const id = await this.myId();
    const patch: Record<string, unknown> = {};
    if (input.username !== undefined) patch.username = input.username.toLowerCase();
    if (input.displayName !== undefined) patch.display_name = input.displayName;
    if (input.avatarUri) {
      patch.avatar_url = this.sb.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(await this.upload(input.avatarUri, AVATAR_BUCKET)).data.publicUrl;
    }
    patch.onboarded = true;
    const { error } = await this.sb.from('profiles').update(patch).eq('id', id);
    if (error) throw error;
    return this.getMe();
  }

  async listCatalogue(): Promise<Commitment[]> {
    const { data, error } = await this.sb
      .from('commitments')
      .select('*')
      .is('owner_id', null)
      .order('category')
      .order('points', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toCommitment);
  }

  async myCommitments(): Promise<UserCommitment[]> {
    const id = await this.myId();
    const { data, error } = await this.sb
      .from('user_commitments')
      .select('*, commitments(*)')
      .eq('user_id', id)
      .eq('active', true)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map(toUserCommitment);
  }

  async addCommitment(input: { commitmentId?: ID }): Promise<void> {
    const id = await this.myId();
    const { data: c, error: e1 } = await this.sb
      .from('commitments')
      .select('*')
      .eq('id', input.commitmentId!)
      .single();
    if (e1) throw e1;
    const { error } = await this.sb.from('user_commitments').insert({
      user_id: id,
      commitment_id: c.id,
      points: c.points,
      frequency: c.frequency,
    });
    if (error && error.code !== '23505') throw error; // ignore dup
  }

  async archiveCommitment(ucId: ID): Promise<void> {
    const { error } = await this.sb.from('user_commitments').update({ active: false }).eq('id', ucId);
    if (error) throw error;
  }

  async today(): Promise<TodayState> {
    const [ucs, leaderboard, me] = await Promise.all([
      this.myCommitments(),
      this.friendsLeaderboard(),
      this.getMe(),
    ]);
    const kept = ucs.filter((c) => c.keptToday).length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayEvents } = await this.sb
      .from('point_events')
      .select('points')
      .eq('user_id', me.id)
      .gte('created_at', todayStart.toISOString());
    return {
      dateLabel: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase(),
      commitments: ucs,
      keptCount: kept,
      totalCount: ucs.length,
      pointsToday: (todayEvents ?? []).reduce((s: number, e: Row) => s + e.points, 0),
      leaderboard,
    };
  }

  private async friendsLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data: mates } = await this.sb.rpc('crew_mate_ids');
    const ids = (mates ?? []).map((r: Row) => r.crew_mate_ids ?? r) as string[];
    const me = await this.myId();
    if (!ids.length) ids.push(me);
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const [profiles, events, ucs] = await Promise.all([
      this.sb.from('profiles').select('*').in('id', ids),
      this.sb.from('point_events').select('user_id, points').in('user_id', ids).gte('created_at', weekAgo),
      this.sb.from('user_commitments').select('user_id, current_streak').in('user_id', ids).eq('active', true),
    ]);
    const pointsBy = new Map<string, number>();
    for (const e of events.data ?? []) pointsBy.set(e.user_id, (pointsBy.get(e.user_id) ?? 0) + e.points);
    const streakBy = new Map<string, number>();
    for (const u of ucs.data ?? []) streakBy.set(u.user_id, Math.max(streakBy.get(u.user_id) ?? 0, u.current_streak));
    return (profiles.data ?? [])
      .map((p: Row) => ({
        user: toProfile(p),
        points: pointsBy.get(p.id) ?? 0,
        streak: streakBy.get(p.id) ?? 0,
        isMe: p.id === me,
      }))
      .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.points - a.points);
  }

  async myCrews(): Promise<Crew[]> {
    const me = await this.myId();
    const { data, error } = await this.sb
      .from('crew_members')
      .select('role, crews(*, crew_members(count))')
      .eq('user_id', me);
    if (error) throw error;
    const crews: Crew[] = [];
    for (const r of data ?? []) {
      const c: Row = Array.isArray(r.crews) ? r.crews[0] : r.crews;
      const { data: streak } = await this.sb.rpc('crew_streak', { p_crew_id: c.id });
      crews.push({
        id: c.id,
        name: c.name,
        inviteCode: c.invite_code,
        memberCount: c.crew_members?.[0]?.count ?? 0,
        crewStreak: streak ?? 0,
        myRole: r.role,
      });
    }
    return crews;
  }

  async createCrew(name: string): Promise<Crew> {
    const { data, error } = await this.sb.rpc('create_crew', { p_name: name });
    if (error) throw error;
    const c = Array.isArray(data) ? data[0] : data;
    return { id: c.id, name: c.name, inviteCode: c.invite_code, memberCount: 1, crewStreak: 0, myRole: 'owner' };
  }

  async joinCrew(inviteCode: string): Promise<Crew> {
    const { data, error } = await this.sb.rpc('join_crew', { p_code: inviteCode });
    if (error) throw error;
    const c = Array.isArray(data) ? data[0] : data;
    const { count } = await this.sb
      .from('crew_members')
      .select('*', { count: 'exact', head: true })
      .eq('crew_id', c.id);
    return {
      id: c.id,
      name: c.name,
      inviteCode: c.invite_code,
      memberCount: count ?? 2,
      crewStreak: 0,
      myRole: 'member',
    };
  }

  async leaveCrew(crewId: ID): Promise<void> {
    const me = await this.myId();
    const { error } = await this.sb.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', me);
    if (error) throw error;
  }

  async crewDetail(crewId: ID) {
    const { data: crewRow, error } = await this.sb
      .from('crews')
      .select('*')
      .eq('id', crewId)
      .single();
    if (error) throw error;
    const { data: memberRows } = await this.sb
      .from('crew_members')
      .select('role, profiles(*)')
      .eq('crew_id', crewId);
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const ids = (memberRows ?? []).map((m: Row) => m.profiles.id);
    const { data: events } = await this.sb
      .from('point_events')
      .select('user_id, points')
      .in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', weekAgo);
    const pointsBy = new Map<string, number>();
    for (const e of events ?? []) pointsBy.set(e.user_id, (pointsBy.get(e.user_id) ?? 0) + e.points);
    const members: CrewMember[] = (memberRows ?? [])
      .map((m: Row) => ({ user: toProfile(m.profiles), role: m.role, weekPoints: pointsBy.get(m.profiles.id) ?? 0 }))
      .sort((a: CrewMember, b: CrewMember) => b.weekPoints - a.weekPoints);
    const { data: streak } = await this.sb.rpc('crew_streak', { p_crew_id: crewId });
    const { data: posts } = await this.sb
      .from('proof_posts')
      .select('*, profiles(*), user_commitments(*, commitments(*))')
      .in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })
      .limit(12);
    return {
      crew: {
        id: crewRow.id,
        name: crewRow.name,
        inviteCode: crewRow.invite_code,
        memberCount: members.length,
        crewStreak: streak ?? 0,
      },
      members,
      recentPosts: await this.decoratePosts(posts ?? []),
    };
  }

  private async decoratePosts(rows: Row[]): Promise<ProofPost[]> {
    const me = await this.myId();
    const postIds = rows.map((r) => r.id);
    const [{ data: reacts }, { data: cmts }] = await Promise.all([
      this.sb.from('reactions').select('post_id, emoji, user_id').in('post_id', postIds.length ? postIds : ['00000000-0000-0000-0000-000000000000']),
      this.sb.from('comments').select('post_id').in('post_id', postIds.length ? postIds : ['00000000-0000-0000-0000-000000000000']),
    ]);
    return rows.map((r) => {
      const byEmoji = new Map<string, { count: number; mine: boolean }>();
      for (const re of reacts ?? []) {
        if (re.post_id !== r.id) continue;
        const cur = byEmoji.get(re.emoji) ?? { count: 0, mine: false };
        cur.count += 1;
        if (re.user_id === me) cur.mine = true;
        byEmoji.set(re.emoji, cur);
      }
      r.reaction_summary = [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }));
      r.comment_count = (cmts ?? []).filter((c: Row) => c.post_id === r.id).length;
      return toPost(r, (p) => this.publicUrl(p));
    });
  }

  async submitKeep(input: { userCommitmentId: ID; photoUri: string; caption?: string }): Promise<KeepResult> {
    const path = await this.upload(input.photoUri, PROOF_BUCKET);
    const { data, error } = await this.sb.rpc('submit_keep', {
      p_user_commitment_id: input.userCommitmentId,
      p_photo_path: path,
      p_caption: input.caption ?? null,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { postId: row.post_id, pointsAwarded: row.points_awarded, newStreak: row.new_streak };
  }

  async feed(_kind: FeedKind): Promise<ProofPost[]> {
    const { data: mates } = await this.sb.rpc('crew_mate_ids');
    const ids = ((mates ?? []).map((r: Row) => r.crew_mate_ids ?? r) as string[]) ?? [];
    const me = await this.myId();
    if (!ids.includes(me)) ids.push(me);
    const { data, error } = await this.sb
      .from('proof_posts')
      .select('*, profiles(*), user_commitments(*, commitments(*))')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return this.decoratePosts(data ?? []);
  }

  async comments(postId: ID): Promise<PostComment[]> {
    const { data, error } = await this.sb
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', postId)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map((c: Row) => ({
      id: c.id,
      user: toProfile(c.profiles),
      body: c.body,
      createdAt: c.created_at,
    }));
  }

  async addComment(postId: ID, body: string): Promise<PostComment> {
    const me = await this.myId();
    const { data, error } = await this.sb
      .from('comments')
      .insert({ post_id: postId, user_id: me, body })
      .select('*, profiles(*)')
      .single();
    if (error) throw error;
    return { id: data.id, user: toProfile(data.profiles), body: data.body, createdAt: data.created_at };
  }

  async toggleReaction(postId: ID, emoji: string): Promise<void> {
    const me = await this.myId();
    const { data: existing } = await this.sb
      .from('reactions')
      .select('emoji')
      .eq('post_id', postId)
      .eq('user_id', me)
      .eq('emoji', emoji)
      .maybeSingle();
    if (existing) {
      await this.sb.from('reactions').delete().eq('post_id', postId).eq('user_id', me).eq('emoji', emoji);
    } else {
      await this.sb.from('reactions').insert({ post_id: postId, user_id: me, emoji });
    }
  }

  async profileStats(): Promise<ProfileStats> {
    const me = await this.myId();
    const { data: posts } = await this.sb
      .from('proof_posts')
      .select('*, profiles(*), user_commitments(*, commitments(*))')
      .eq('user_id', me)
      .order('created_at', { ascending: false })
      .limit(60);
    const [ucs, crews] = await Promise.all([this.myCommitments(), this.myCrews()]);
    return { proofGrid: await this.decoratePosts(posts ?? []), commitments: ucs, crews };
  }
}
