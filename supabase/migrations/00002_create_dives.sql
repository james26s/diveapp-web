create table public.dives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  dive_date date not null default current_date,
  location_name text,
  latitude double precision,
  longitude double precision,
  max_depth numeric(6,1),
  duration integer, -- seconds
  water_temp numeric(4,1),
  visibility numeric(4,1), -- meters
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dives_user_id_idx on public.dives(user_id);
create index dives_dive_date_idx on public.dives(dive_date desc);

create trigger dives_updated_at
  before update on public.dives
  for each row execute function public.update_updated_at();
