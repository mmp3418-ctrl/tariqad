-- منصة طارق — Full Admin Schema
-- Run in Supabase SQL Editor

-- Admin users
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  role text not null default 'helper' check (role in ('admin', 'helper')),
  created_at timestamptz not null default now()
);

insert into public.admin_users (username, password, role)
values ('admin', 'tariq2026', 'admin')
on conflict (username) do nothing;

-- Announcements
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message_ar text not null,
  message_en text not null default '',
  is_active boolean not null default true,
  kind text not null default 'update',
  created_at timestamptz not null default now()
);
alter table public.announcements add column if not exists kind text not null default 'update';

-- Grades
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  stage text not null check (stage in ('primary', 'preparatory', 'secondary')),
  title_ar text not null,
  title_en text not null default '',
  slug text not null unique,
  sort_order integer not null default 0
);

-- Resources (notes=pdf, videos=video)
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades (id) on delete cascade,
  type text not null check (type in ('pdf', 'video', 'playlist')),
  title_ar text not null,
  title_en text not null default '',
  subject_ar text not null default '',
  subject_en text not null default '',
  term text,
  url text not null,
  description_ar text,
  description_en text,
  badge_color text not null default '#0f766e',
  icon_type text not null default 'file-text',
  cover_image_url text
);

alter table public.resources add column if not exists description_ar text;
alter table public.resources add column if not exists description_en text;
alter table public.resources add column if not exists badge_color text not null default '#0f766e';
alter table public.resources add column if not exists icon_type text not null default 'file-text';
alter table public.resources add column if not exists cover_image_url text;

-- Allow legacy playlist rows; new inserts use video
do $$ begin
  alter table public.resources drop constraint if exists resources_type_check;
exception when undefined_object then null;
end $$;

alter table public.resources
  add constraint resources_type_check
  check (type in ('pdf', 'video', 'playlist'));

-- Teacher schedules
create table if not exists public.teacher_schedules (
  id uuid primary key default gen_random_uuid(),
  teacher_name text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  period_number integer not null check (period_number between 1 and 12),
  class_name text not null,
  subject text not null,
  is_active boolean not null default true
);
alter table public.teacher_schedules add column if not exists is_active boolean not null default true;

-- Site settings
create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  logo_url text,
  phone_number text,
  whatsapp_number text,
  telegram_link text,
  social_links jsonb not null default '[]'::jsonb,
  admin_password text,
  updated_at timestamptz not null default now()
);
alter table public.site_settings add column if not exists admin_password text;

insert into public.site_settings (id, social_links)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

-- Storage bucket (run separately if needed via dashboard)
-- insert into storage.buckets (id, name, public) values ('platform-assets', 'platform-assets', true) on conflict do nothing;

-- RLS
alter table public.admin_users enable row level security;
alter table public.announcements enable row level security;
alter table public.grades enable row level security;
alter table public.resources enable row level security;
alter table public.teacher_schedules enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Allow all admin_users" on public.admin_users;
drop policy if exists "Allow all announcements" on public.announcements;
drop policy if exists "Allow all grades" on public.grades;
drop policy if exists "Allow all resources" on public.resources;
drop policy if exists "Allow all teacher_schedules" on public.teacher_schedules;
drop policy if exists "Allow all site_settings" on public.site_settings;

create policy "Allow all admin_users" on public.admin_users for all using (true) with check (true);
create policy "Allow all announcements" on public.announcements for all using (true) with check (true);
create policy "Allow all grades" on public.grades for all using (true) with check (true);
create policy "Allow all resources" on public.resources for all using (true) with check (true);
create policy "Allow all teacher_schedules" on public.teacher_schedules for all using (true) with check (true);
create policy "Allow all site_settings" on public.site_settings for all using (true) with check (true);
