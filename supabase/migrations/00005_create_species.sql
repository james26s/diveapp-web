create type species_category as enum ('fish', 'coral', 'invertebrate', 'mammal', 'reptile');

create table public.species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  scientific_name text,
  category species_category not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index species_category_idx on public.species(category);
create index species_common_name_idx on public.species(common_name);

-- Junction table for highlight <-> species
create table public.highlight_species (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references public.highlights(id) on delete cascade,
  species_id uuid not null references public.species(id) on delete cascade,
  confidence numeric(3,2) not null default 0.0,
  bounding_box jsonb,
  created_at timestamptz not null default now(),
  unique(highlight_id, species_id)
);

create index highlight_species_highlight_idx on public.highlight_species(highlight_id);
create index highlight_species_species_idx on public.highlight_species(species_id);

-- Seed common marine species
insert into public.species (common_name, scientific_name, category) values
  ('Green Sea Turtle', 'Chelonia mydas', 'reptile'),
  ('Hawksbill Turtle', 'Eretmochelys imbricata', 'reptile'),
  ('Manta Ray', 'Mobula birostris', 'fish'),
  ('Whale Shark', 'Rhincodon typus', 'fish'),
  ('Clownfish', 'Amphiprion ocellaris', 'fish'),
  ('Blue Tang', 'Paracanthurus hepatus', 'fish'),
  ('Lionfish', 'Pterois volitans', 'fish'),
  ('Moray Eel', 'Gymnothorax javanicus', 'fish'),
  ('Barracuda', 'Sphyraena barracuda', 'fish'),
  ('Parrotfish', 'Scaridae', 'fish'),
  ('Butterflyfish', 'Chaetodontidae', 'fish'),
  ('Angelfish', 'Pomacanthidae', 'fish'),
  ('Grouper', 'Epinephelinae', 'fish'),
  ('Surgeonfish', 'Acanthuridae', 'fish'),
  ('Napoleon Wrasse', 'Cheilinus undulatus', 'fish'),
  ('Hammerhead Shark', 'Sphyrna', 'fish'),
  ('Reef Shark', 'Carcharhinus amblyrhynchos', 'fish'),
  ('Octopus', 'Octopoda', 'invertebrate'),
  ('Cuttlefish', 'Sepiida', 'invertebrate'),
  ('Giant Clam', 'Tridacna gigas', 'invertebrate'),
  ('Sea Cucumber', 'Holothuroidea', 'invertebrate'),
  ('Nudibranch', 'Nudibranchia', 'invertebrate'),
  ('Crown-of-thorns Starfish', 'Acanthaster planci', 'invertebrate'),
  ('Mantis Shrimp', 'Stomatopoda', 'invertebrate'),
  ('Brain Coral', 'Diploria', 'coral'),
  ('Staghorn Coral', 'Acropora cervicornis', 'coral'),
  ('Table Coral', 'Acropora hyacinthus', 'coral'),
  ('Fan Coral', 'Gorgoniidae', 'coral'),
  ('Fire Coral', 'Millepora', 'coral'),
  ('Humpback Whale', 'Megaptera novaeangliae', 'mammal'),
  ('Bottlenose Dolphin', 'Tursiops truncatus', 'mammal'),
  ('Dugong', 'Dugong dugon', 'mammal'),
  ('Seahorse', 'Hippocampus', 'fish'),
  ('Jellyfish', 'Scyphozoa', 'invertebrate'),
  ('Stingray', 'Myliobatoidei', 'fish');

-- Materialized view for species gallery
create materialized view public.species_gallery as
select
  s.id as species_id,
  s.common_name,
  s.scientific_name,
  s.category,
  s.image_url,
  count(distinct hs.highlight_id) as sighting_count,
  count(distinct h.dive_id) as dive_count,
  max(h.created_at) as latest_sighting,
  (
    select h2.thumbnail_path
    from public.highlights h2
    join public.highlight_species hs2 on hs2.highlight_id = h2.id
    where hs2.species_id = s.id and h2.thumbnail_path is not null
    order by hs2.confidence desc
    limit 1
  ) as best_thumbnail
from public.species s
left join public.highlight_species hs on hs.species_id = s.id
left join public.highlights h on h.id = hs.highlight_id
group by s.id, s.common_name, s.scientific_name, s.category, s.image_url;

create unique index species_gallery_id_idx on public.species_gallery(species_id);
