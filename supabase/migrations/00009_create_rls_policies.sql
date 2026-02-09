-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.dives enable row level security;
alter table public.videos enable row level security;
alter table public.highlights enable row level security;
alter table public.species enable row level security;
alter table public.highlight_species enable row level security;
alter table public.dive_logs enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Dives: users own their dives
create policy "Users can view own dives" on public.dives
  for select using (auth.uid() = user_id);
create policy "Users can insert own dives" on public.dives
  for insert with check (auth.uid() = user_id);
create policy "Users can update own dives" on public.dives
  for update using (auth.uid() = user_id);
create policy "Users can delete own dives" on public.dives
  for delete using (auth.uid() = user_id);

-- Videos: users own their videos
create policy "Users can view own videos" on public.videos
  for select using (auth.uid() = user_id);
create policy "Users can insert own videos" on public.videos
  for insert with check (auth.uid() = user_id);
create policy "Users can update own videos" on public.videos
  for update using (auth.uid() = user_id);
create policy "Users can delete own videos" on public.videos
  for delete using (auth.uid() = user_id);

-- Highlights: users see own + public highlights
create policy "Users can view own highlights" on public.highlights
  for select using (auth.uid() = user_id);
create policy "Public highlights are viewable" on public.highlights
  for select using (is_public = true);
create policy "Users can insert own highlights" on public.highlights
  for insert with check (auth.uid() = user_id);
create policy "Users can update own highlights" on public.highlights
  for update using (auth.uid() = user_id);
create policy "Users can delete own highlights" on public.highlights
  for delete using (auth.uid() = user_id);

-- Species: everyone can read
create policy "Species are viewable by everyone" on public.species
  for select using (true);

-- Highlight species: follows highlight access
create policy "Users can view highlight species for own highlights" on public.highlight_species
  for select using (
    exists (
      select 1 from public.highlights h
      where h.id = highlight_id and (h.user_id = auth.uid() or h.is_public = true)
    )
  );
create policy "Users can insert highlight species for own highlights" on public.highlight_species
  for insert with check (
    exists (
      select 1 from public.highlights h
      where h.id = highlight_id and h.user_id = auth.uid()
    )
  );

-- Dive logs: users own their dive logs
create policy "Users can view own dive logs" on public.dive_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own dive logs" on public.dive_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own dive logs" on public.dive_logs
  for update using (auth.uid() = user_id);

-- Processing jobs: users can view own
create policy "Users can view own processing jobs" on public.processing_jobs
  for select using (auth.uid() = user_id);

-- Subscriptions: users can view own
create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);
