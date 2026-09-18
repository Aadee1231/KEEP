-- KEEP database schema for Supabase.
-- Auth is Clerk (third-party OIDC): auth.jwt()->>'sub' holds the Clerk user id.
-- Run this in the Supabase SQL editor, then enable Clerk under
-- Authentication → Sign In / Up → Third Party → Clerk.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  clerk_id    text not null unique,
  username    text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '',
  avatar_url  text,
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.crews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  invite_code text not null unique,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.crew_members (
  crew_id   uuid not null references public.crews(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table if not exists public.commitments (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid references public.profiles(id) on delete cascade, -- null = curated catalogue
  name           text not null check (char_length(name) between 1 and 40),
  icon           text not null default 'checkbox-outline',
  category       text not null default 'Personal',
  points         int  not null default 100 check (points between 0 and 10000),
  proof_required boolean not null default true,
  frequency      text not null default 'daily' check (frequency in ('daily','weekdays','weekly')),
  created_at     timestamptz not null default now()
);

create table if not exists public.user_commitments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  commitment_id  uuid not null references public.commitments(id) on delete cascade,
  points         int  not null,
  frequency      text not null default 'daily' check (frequency in ('daily','weekdays','weekly')),
  active         boolean not null default true,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_kept_on   date,
  created_at     timestamptz not null default now(),
  unique (user_id, commitment_id)
);

create table if not exists public.proof_posts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  user_commitment_id uuid not null references public.user_commitments(id) on delete cascade,
  photo_path         text not null,
  caption            text check (caption is null or char_length(caption) <= 140),
  points_awarded     int not null default 0,
  streak_after       int not null default 0,
  kept_on            date not null default current_date,
  created_at         timestamptz not null default now()
);

create table if not exists public.reactions (
  post_id uuid not null references public.proof_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji   text not null check (emoji in ('🔥','💪','👏','😤')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.proof_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);

create table if not exists public.point_events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  user_commitment_id uuid references public.user_commitments(id) on delete cascade,
  proof_post_id      uuid references public.proof_posts(id) on delete cascade,
  points             int not null,
  created_at         timestamptz not null default now()
);

create index if not exists idx_crew_members_user on public.crew_members(user_id);
create index if not exists idx_posts_user on public.proof_posts(user_id, created_at desc);
create index if not exists idx_posts_kept_on on public.proof_posts(kept_on);
create index if not exists idx_point_events_user on public.point_events(user_id, created_at desc);
create index if not exists idx_comments_post on public.comments(post_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so RLS never recurses through profiles)
-- ---------------------------------------------------------------------------

create or replace function public.my_profile_id()
returns uuid
language sql stable security definer set search_path = public as
$$ select id from profiles where clerk_id = (select auth.jwt() ->> 'sub') $$;

create or replace function public.shares_crew(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as
$$
  select exists (
    select 1
    from crew_members ma
    join crew_members mb on mb.crew_id = ma.crew_id
    where ma.user_id = a and mb.user_id = b
  ) or a = b
$$;

-- All users who share at least one crew with me (plus me).
create or replace function public.crew_mate_ids()
returns setof uuid
language sql stable security definer set search_path = public as
$$
  select distinct cm2.user_id
  from crew_members cm1
  join crew_members cm2 on cm2.crew_id = cm1.crew_id
  where cm1.user_id = public.my_profile_id()
  union select public.my_profile_id()
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.crews             enable row level security;
alter table public.crew_members      enable row level security;
alter table public.commitments       enable row level security;
alter table public.user_commitments  enable row level security;
alter table public.proof_posts       enable row level security;
alter table public.reactions         enable row level security;
alter table public.comments          enable row level security;
alter table public.point_events      enable row level security;

create policy profiles_select on public.profiles
  for select using (true); -- public profiles; tighten later if desired
create policy profiles_insert on public.profiles
  for insert with check (clerk_id = (select auth.jwt() ->> 'sub'));
create policy profiles_update on public.profiles
  for update using (clerk_id = (select auth.jwt() ->> 'sub'));

create policy crews_select on public.crews
  for select using (
    exists (select 1 from crew_members cm
            where cm.crew_id = id and cm.user_id = public.my_profile_id())
  );
create policy crews_insert on public.crews
  for insert with check (created_by = public.my_profile_id());

create policy crew_members_select on public.crew_members
  for select using (public.shares_crew(user_id, public.my_profile_id()));
create policy crew_members_insert_self on public.crew_members
  for insert with check (user_id = public.my_profile_id());
create policy crew_members_delete on public.crew_members
  for delete using (
    user_id = public.my_profile_id()
    or exists (select 1 from crew_members owner
               where owner.crew_id = crew_members.crew_id
                 and owner.user_id = public.my_profile_id()
                 and owner.role = 'owner')
  );

create policy commitments_select on public.commitments
  for select using (owner_id is null or owner_id = public.my_profile_id());
create policy commitments_insert on public.commitments
  for insert with check (owner_id = public.my_profile_id());

create policy user_commitments_select on public.user_commitments
  for select using (public.shares_crew(user_id, public.my_profile_id()));
create policy user_commitments_all_own on public.user_commitments
  for all using (user_id = public.my_profile_id())
  with check (user_id = public.my_profile_id());

create policy proof_posts_select on public.proof_posts
  for select using (public.shares_crew(user_id, public.my_profile_id()));
create policy proof_posts_insert on public.proof_posts
  for insert with check (user_id = public.my_profile_id());

create policy reactions_select on public.reactions
  for select using (
    exists (select 1 from proof_posts p
            where p.id = post_id
              and public.shares_crew(p.user_id, public.my_profile_id()))
  );
create policy reactions_write on public.reactions
  for all using (user_id = public.my_profile_id())
  with check (user_id = public.my_profile_id());

create policy comments_select on public.comments
  for select using (
    exists (select 1 from proof_posts p
            where p.id = post_id
              and public.shares_crew(p.user_id, public.my_profile_id()))
  );
create policy comments_insert on public.comments
  for insert with check (user_id = public.my_profile_id());
create policy comments_delete on public.comments
  for delete using (user_id = public.my_profile_id());

create policy point_events_select on public.point_events
  for select using (public.shares_crew(user_id, public.my_profile_id()));
-- inserts only happen inside submit_keep (security definer)

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_crew(p_name text)
returns public.crews
language plpgsql security definer set search_path = public as
$$
declare
  v_crew crews%rowtype;
begin
  insert into crews (name, invite_code, created_by)
  values (upper(p_name), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)), public.my_profile_id())
  returning * into v_crew;

  insert into crew_members (crew_id, user_id, role) values (v_crew.id, public.my_profile_id(), 'owner');
  return v_crew;
end;
$$;

create or replace function public.join_crew(p_code text)
returns public.crews
language plpgsql security definer set search_path = public as
$$
declare
  v_crew crews%rowtype;
begin
  select * into v_crew from crews where invite_code = upper(trim(p_code));
  if not found then
    raise exception 'No crew found with that invite code.';
  end if;
  insert into crew_members (crew_id, user_id)
  values (v_crew.id, public.my_profile_id())
  on conflict do nothing;
  return v_crew;
end;
$$;

-- Atomically record a keep: post + points + streak, once per day per commitment.
create or replace function public.submit_keep(
  p_user_commitment_id uuid,
  p_photo_path text,
  p_caption text default null
)
returns table (post_id uuid, points_awarded int, new_streak int)
language plpgsql security definer set search_path = public as
$$
declare
  v_uc   user_commitments%rowtype;
  v_post proof_posts%rowtype;
  v_streak int;
begin
  select * into v_uc from user_commitments
  where id = p_user_commitment_id and user_id = public.my_profile_id() and active;
  if not found then
    raise exception 'Commitment not found';
  end if;
  if v_uc.last_kept_on = current_date then
    raise exception 'Already kept today';
  end if;

  v_streak := case when v_uc.last_kept_on = current_date - 1
                   then v_uc.current_streak + 1 else 1 end;

  insert into proof_posts (user_id, user_commitment_id, photo_path, caption, points_awarded, streak_after)
  values (public.my_profile_id(), p_user_commitment_id, p_photo_path, p_caption, v_uc.points, v_streak)
  returning * into v_post;

  insert into point_events (user_id, user_commitment_id, proof_post_id, points)
  values (public.my_profile_id(), p_user_commitment_id, v_post.id, v_uc.points);

  update user_commitments
  set current_streak = v_streak,
      longest_streak = greatest(longest_streak, v_streak),
      last_kept_on   = current_date
  where id = p_user_commitment_id;

  return query select v_post.id, v_uc.points, v_streak;
end;
$$;

-- Consecutive days (ending today or yesterday) with at least one keep by any member.
create or replace function public.crew_streak(p_crew_id uuid)
returns int
language sql stable security definer set search_path = public as
$$
  with days as (
    select distinct pp.kept_on
    from proof_posts pp
    join crew_members cm on cm.user_id = pp.user_id and cm.crew_id = p_crew_id
  ),
  streak as (
    select count(*) as n
    from (
      select kept_on,
             kept_on - row_number() over (order by kept_on desc)::int as grp
      from days
      where kept_on <= current_date
    ) g
    where grp = (select max(kept_on) - 0 from days where kept_on in (current_date, current_date - 1))
  )
  select coalesce((select n from streak), 0)
$$;

-- ---------------------------------------------------------------------------
-- Storage buckets (public read; write restricted to the owner's folder)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy storage_upload_own on storage.objects
  for insert with check (
    bucket_id in ('proofs', 'avatars')
    and (select auth.jwt() ->> 'sub') is not null
  );

-- ---------------------------------------------------------------------------
-- Curated commitment catalogue
-- ---------------------------------------------------------------------------

insert into public.commitments (name, icon, category, points, proof_required, frequency) values
  ('GYM',                'barbell-outline',        'Fitness',      250, true,  'daily'),
  ('RUN',                'walk-outline',           'Fitness',      200, true,  'daily'),
  ('10K STEPS',          'footsteps-outline',      'Fitness',      150, false, 'daily'),
  ('STUDY 1 HR',         'book-outline',           'School',       200, true,  'daily'),
  ('STUDY 2 HR',         'library-outline',        'School',       350, true,  'daily'),
  ('READ',               'reader-outline',         'Personal',     150, false, 'daily'),
  ('UP BEFORE 8',        'sunny-outline',          'Sleep',        200, true,  'daily'),
  ('SLEEP BY 12',        'moon-outline',           'Sleep',        150, false, 'daily'),
  ('NO SOCIAL TIL NOON', 'phone-portrait-outline', 'Productivity', 200, false, 'daily'),
  ('SIDE PROJECT',       'code-slash-outline',     'Productivity', 250, true,  'daily'),
  ('DRINK WATER',        'water-outline',          'Wellness',     100, false, 'daily'),
  ('MEDITATE',           'leaf-outline',           'Wellness',     150, false, 'daily')
on conflict do nothing;
