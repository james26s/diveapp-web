create type processing_job_type as enum (
  'scene_analysis',
  'species_detection',
  'highlight_extraction',
  'color_correction',
  'clip_generation',
  'dive_log_generation',
  'thumbnail_generation'
);

create type processing_job_status as enum ('pending', 'running', 'completed', 'failed');

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type processing_job_type not null,
  status processing_job_status not null default 'pending',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  result jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index processing_jobs_video_id_idx on public.processing_jobs(video_id);
create index processing_jobs_status_idx on public.processing_jobs(status);
create index processing_jobs_pending_idx on public.processing_jobs(status, created_at)
  where status = 'pending';
