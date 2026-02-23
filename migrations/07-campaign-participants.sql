-- 07-campaign-participants.sql
-- Tracks which users have officially joined a campaign

create table if not exists public.campaign_participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint campaign_participants_unique unique (user_id, campaign_id)
);

-- Enable RLS
alter table public.campaign_participants enable row level security;

-- Users can read their own participations
create policy "users_select_own_participations"
  on public.campaign_participants
  for select
  using (auth.uid() = user_id);

-- Users can join campaigns (insert their own rows)
create policy "users_insert_own_participations"
  on public.campaign_participants
  for insert
  with check (auth.uid() = user_id);

-- Admins can read all participations
create policy "admins_select_all_participations"
  on public.campaign_participants
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
