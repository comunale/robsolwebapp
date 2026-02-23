-- 08-mural-slides.sql
-- Information slideshow managed by admins, shown on the user dashboard

create table if not exists public.mural_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  bg_color text not null default '#6366f1',
  text_color text not null default '#ffffff',
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mural_slides enable row level security;

-- Authenticated users can read active slides (for user dashboard)
create policy "auth_select_active_slides"
  on public.mural_slides
  for select
  using (auth.role() = 'authenticated' and is_active = true);

-- Admins can read all slides including inactive
create policy "admin_select_all_slides"
  on public.mural_slides
  for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can insert
create policy "admin_insert_slides"
  on public.mural_slides
  for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can update
create policy "admin_update_slides"
  on public.mural_slides
  for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can delete
create policy "admin_delete_slides"
  on public.mural_slides
  for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
