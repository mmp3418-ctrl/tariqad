-- منصة طارق — إعدادات الموقع وروابط التواصل
-- Run in Supabase SQL Editor

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  phone_number text,
  whatsapp_number text,
  telegram_link text,
  social_links jsonb not null default '[]'::jsonb,
  hero_subtitle_ar text,
  book_year_label text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings add column if not exists phone_number text;
alter table public.site_settings add column if not exists whatsapp_number text;
alter table public.site_settings add column if not exists telegram_link text;
alter table public.site_settings add column if not exists social_links jsonb not null default '[]'::jsonb;
alter table public.site_settings add column if not exists hero_subtitle_ar text;
alter table public.site_settings add column if not exists book_year_label text;
alter table public.site_settings add column if not exists updated_at timestamptz not null default now();

insert into public.site_settings (id, social_links, hero_subtitle_ar, book_year_label)
values (
  1,
  '[]'::jsonb,
  'منصتك التعليمية الشاملة للمنهج الليبي',
  '2026 - 2027'
)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Allow all site_settings" on public.site_settings;
create policy "Allow all site_settings"
  on public.site_settings
  for all
  using (true)
  with check (true);
