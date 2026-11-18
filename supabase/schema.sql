-- منصة طارق — إعدادات الموقع وقنوات التواصل
-- Run in Supabase SQL Editor

-- ---------------------------------------------------------------------------
-- site_settings: single-row contact / location settings
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  email text,
  location text,
  whatsapp text,
  telegram text,
  google_maps_url text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings add column if not exists email text;
alter table public.site_settings add column if not exists location text;
alter table public.site_settings add column if not exists whatsapp text;
alter table public.site_settings add column if not exists telegram text;
alter table public.site_settings add column if not exists google_maps_url text;
alter table public.site_settings add column if not exists updated_at timestamptz not null default now();

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Allow all site_settings" on public.site_settings;
create policy "Allow all site_settings"
  on public.site_settings
  for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- social_links: dynamic social channels (CRUD)
-- ---------------------------------------------------------------------------
create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform_name text not null,
  url text not null,
  icon_name text not null default 'globe',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_links add column if not exists platform_name text;
alter table public.social_links add column if not exists url text;
alter table public.social_links add column if not exists icon_name text not null default 'globe';
alter table public.social_links add column if not exists is_active boolean not null default true;
alter table public.social_links add column if not exists sort_order integer not null default 0;
alter table public.social_links add column if not exists created_at timestamptz not null default now();
alter table public.social_links add column if not exists updated_at timestamptz not null default now();

alter table public.social_links enable row level security;

drop policy if exists "Allow all social_links" on public.social_links;
create policy "Allow all social_links"
  on public.social_links
  for all
  using (true)
  with check (true);

create index if not exists social_links_sort_idx
  on public.social_links (sort_order asc, created_at asc);
