create table public.dive_logs (
  id uuid primary key default gen_random_uuid(),
  dive_id uuid not null references public.dives(id) on delete cascade unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  summary text not null,
  species_seen jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '{}'::jsonb,
  ai_generated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dive_logs_dive_id_idx on public.dive_logs(dive_id);
create index dive_logs_user_id_idx on public.dive_logs(user_id);

create trigger dive_logs_updated_at
  before update on public.dive_logs
  for each row execute function public.update_updated_at();
