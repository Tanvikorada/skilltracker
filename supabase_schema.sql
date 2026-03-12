-- SkillCensus Supabase schema
create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('talent','seeker')),
  name text not null,
  email text not null unique,
  phone text,
  emoji text,
  state text,
  district text,
  skills text[] default '{}',
  primary_role text,
  exp_years int default 0,
  verify_status text default 'self' check (verify_status in ('self','peer','gov')),
  avail text default 'open' check (avail in ('open','busy','no')),
  category text default 'tech',
  bio text default '',
  rating numeric(3,2) default 5.0,
  views int default 0,
  lat double precision,
  lng double precision,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists connections (
  user_id uuid references profiles(id) on delete cascade,
  target_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, target_id),
  check (user_id <> target_id)
);

create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  user1 uuid references profiles(id) on delete cascade,
  user2 uuid references profiles(id) on delete cascade,
  updated_at timestamptz default now(),
  check (user1 <> user2)
);
create unique index if not exists threads_user_pair on threads(user1, user2);

create table if not exists thread_members (
  thread_id uuid references threads(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (thread_id, user_id)
);

create table if not exists messages (
  id bigserial primary key,
  thread_id uuid references threads(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  body text,
  type text default 'text',
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  icon text,
  text text,
  created_at timestamptz default now(),
  read boolean default false
);

create table if not exists endorsements (
  id bigserial primary key,
  endorser_id uuid references profiles(id) on delete cascade,
  target_id uuid references profiles(id) on delete cascade,
  skill text not null,
  created_at timestamptz default now(),
  unique (endorser_id, target_id, skill)
);

create table if not exists verification_requests (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in ('gov','peer','employer')),
  status text default 'pending',
  created_at timestamptz default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute procedure set_updated_at();

create or replace function set_thread_updated_at()
returns trigger as $$
begin
  update threads set updated_at = now() where id = new.thread_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_thread_updated_at on messages;
create trigger trg_thread_updated_at
after insert on messages
for each row execute procedure set_thread_updated_at();

alter table profiles enable row level security;
alter table connections enable row level security;
alter table threads enable row level security;
alter table thread_members enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table endorsements enable row level security;
alter table verification_requests enable row level security;

-- Profiles: public read, owner write
create policy "profiles_select" on profiles
  for select using (true);
create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

-- Connections: participants read, owner write
create policy "connections_select" on connections
  for select using (auth.uid() = user_id or auth.uid() = target_id);
create policy "connections_insert" on connections
  for insert with check (auth.uid() = user_id);
create policy "connections_delete" on connections
  for delete using (auth.uid() = user_id);

-- Threads: participants read/write
create policy "threads_select" on threads
  for select using (auth.uid() = user1 or auth.uid() = user2);
create policy "threads_insert" on threads
  for insert with check (auth.uid() = user1 or auth.uid() = user2);
create policy "threads_update" on threads
  for update using (auth.uid() = user1 or auth.uid() = user2);

-- Thread members: participant read/write
create policy "thread_members_select" on thread_members
  for select using (auth.uid() = user_id);
create policy "thread_members_upsert" on thread_members
  for insert with check (auth.uid() = user_id);
create policy "thread_members_update" on thread_members
  for update using (auth.uid() = user_id);

-- Messages: participants read, sender write
create policy "messages_select" on messages
  for select using (exists (select 1 from threads t where t.id = messages.thread_id and (t.user1 = auth.uid() or t.user2 = auth.uid())));
create policy "messages_insert" on messages
  for insert with check (auth.uid() = sender_id);

-- Notifications: recipient read, any auth insert (MVP)
create policy "notifications_select" on notifications
  for select using (auth.uid() = user_id);
create policy "notifications_insert" on notifications
  for insert with check (auth.uid() is not null);
create policy "notifications_update" on notifications
  for update using (auth.uid() = user_id);
create policy "notifications_delete" on notifications
  for delete using (auth.uid() = user_id);

-- Endorsements: public read, endorser write
create policy "endorsements_select" on endorsements
  for select using (true);
create policy "endorsements_insert" on endorsements
  for insert with check (auth.uid() = endorser_id);

-- Verification requests: owner only
create policy "verif_select" on verification_requests
  for select using (auth.uid() = user_id);
create policy "verif_insert" on verification_requests
  for insert with check (auth.uid() = user_id);
