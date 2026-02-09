create type highlight_type as enum ('species_sighting', 'interesting_moment', 'scenic', 'manual');

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  dive_id uuid not null references public.dives(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type highlight_type not null,
  title text,
  start_time numeric(10,2) not null,
  end_time numeric(10,2) not null,
  clip_path text,
  thumbnail_path text,
  confidence numeric(3,2),
  share_token text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index highlights_video_id_idx on public.highlights(video_id);
create index highlights_dive_id_idx on public.highlights(dive_id);
create index highlights_user_id_idx on public.highlights(user_id);
create index highlights_share_token_idx on public.highlights(share_token) where share_token is not null;
