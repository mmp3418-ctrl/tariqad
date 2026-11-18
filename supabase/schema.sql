-- منصة طارق — إعدادات الموقع وروابط التواصل
-- Run in Supabase SQL Editor

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  phone_number text,
  whatsapp_number text,
  telegram_link text,
  email text,
  location_text text,
  maps_url text,
  social_links jsonb not null default '[]'::jsonb,
  hero_subtitle_ar text,
  book_year_label text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings add column if not exists phone_number text;
alter table public.site_settings add column if not exists whatsapp_number text;
alter table public.site_settings add column if not exists telegram_link text;
alter table public.site_settings add column if not exists email text;
alter table public.site_settings add column if not exists location_text text;
alter table public.site_settings add column if not exists maps_url text;
alter table public.site_settings add column if not exists social_links jsonb not null default '[]'::jsonb;
alter table public.site_settings add column if not exists hero_subtitle_ar text;
alter table public.site_settings add column if not exists book_year_label text;
alter table public.site_settings add column if not exists updated_at timestamptz not null default now();

-- Empty row only — no seeded contact/location/social content
insert into public.site_settings (id, social_links)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Allow all site_settings" on public.site_settings;
create policy "Allow all site_settings"
  on public.site_settings
  for all
  using (true)
  with check (true);
