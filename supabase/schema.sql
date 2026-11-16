-- منصة طارق — Admin Dashboard Schema
-- Run this in the Supabase SQL Editor

-- Announcements
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message_ar text not null,
  message_en text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Grades
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  stage text not null check (stage in ('primary', 'preparatory', 'secondary')),
  title_ar text not null,
  title_en text not null,
  slug text not null unique,
  sort_order integer not null default 0
);

create index if not exists grades_stage_sort_idx on public.grades (stage, sort_order);

-- Resources (PDFs & playlists with card customization)
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades (id) on delete cascade,
  type text not null check (type in ('pdf', 'playlist')),
  title_ar text not null,
  title_en text not null default '',
  subject_ar text not null,
  subject_en text not null default '',
  term text,
  url text not null,
  description_ar text,
  description_en text,
  badge_color text not null default 'teal',
  icon_type text not null default 'file-text'
);

-- Safe upgrades for existing deployments
alter table public.resources add column if not exists description_ar text;
alter table public.resources add column if not exists description_en text;
alter table public.resources add column if not exists badge_color text not null default 'teal';
alter table public.resources add column if not exists icon_type text not null default 'file-text';

create index if not exists resources_grade_id_idx on public.resources (grade_id);

-- Teacher schedules
create table if not exists public.teacher_schedules (
  id uuid primary key default gen_random_uuid(),
  teacher_name text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  period_number integer not null check (period_number between 1 and 12),
  class_name text not null,
  subject text not null
);

create index if not exists teacher_schedules_teacher_idx
  on public.teacher_schedules (teacher_name, day_of_week, period_number);

-- Site settings (singleton row id = 1)
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

insert into public.site_settings (id, logo_url, phone_number, whatsapp_number, telegram_link, social_links, admin_password)
values (1, null, null, null, null, '[]'::jsonb, null)
on conflict (id) do nothing;

-- RLS
alter table public.announcements enable row level security;
alter table public.grades enable row level security;
alter table public.resources enable row level security;
alter table public.teacher_schedules enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Allow all announcements" on public.announcements;
drop policy if exists "Allow all grades" on public.grades;
drop policy if exists "Allow all resources" on public.resources;
drop policy if exists "Allow all teacher_schedules" on public.teacher_schedules;
drop policy if exists "Allow all site_settings" on public.site_settings;

create policy "Allow all announcements"
  on public.announcements for all
  using (true) with check (true);

create policy "Allow all grades"
  on public.grades for all
  using (true) with check (true);

create policy "Allow all resources"
  on public.resources for all
  using (true) with check (true);

create policy "Allow all teacher_schedules"
  on public.teacher_schedules for all
  using (true) with check (true);

create policy "Allow all site_settings"
  on public.site_settings for all
  using (true) with check (true);
