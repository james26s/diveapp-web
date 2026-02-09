create type video_status as enum ('uploading', 'uploaded', 'processing', 'processed', 'failed');

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  dive_id uuid not null references public.dives(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  duration numeric(10,2),
  resolution text,
  format text,
  status video_status not null default 'uploading',
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index videos_dive_id_idx on public.videos(dive_id);
create index videos_user_id_idx on public.videos(user_id);
create index videos_status_idx on public.videos(status);

create trigger videos_updated_at
  before update on public.videos
  for each row execute function public.update_updated_at();
