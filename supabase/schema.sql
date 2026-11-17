-- منصة طارق / Tariq Hub — Full Admin Schema
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
  sort_order integer not null default 0,
  is_coming_soon boolean not null default false
);
alter table public.grades add column if not exists is_coming_soon boolean not null default false;

-- Units
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades (id) on delete cascade,
  title_ar text not null,
  title_en text not null default '',
  sort_order integer not null default 0,
  is_coming_soon boolean not null default false
);
create index if not exists units_grade_id_idx on public.units (grade_id);

-- Lessons
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  title_ar text not null,
  title_en text not null default '',
  sort_order integer not null default 0,
  is_coming_soon boolean not null default false
);
create index if not exists lessons_unit_id_idx on public.lessons (unit_id);

-- Resources (notes=pdf, videos=video)
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
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
  cover_image_url text,
  resource_category text,
  is_coming_soon boolean not null default false
);

alter table public.resources add column if not exists description_ar text;
alter table public.resources add column if not exists description_en text;
alter table public.resources add column if not exists badge_color text not null default '#0f766e';
alter table public.resources add column if not exists icon_type text not null default 'file-text';
alter table public.resources add column if not exists cover_image_url text;
alter table public.resources add column if not exists unit_id uuid references public.units (id) on delete set null;
alter table public.resources add column if not exists lesson_id uuid references public.lessons (id) on delete set null;
alter table public.resources add column if not exists resource_category text;
alter table public.resources add column if not exists is_coming_soon boolean not null default false;

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

-- Teacher resources (tools per grade + unit)
create table if not exists public.teacher_resources (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'lesson_prep', 'worksheets', 'question_banks', 'grammar_summaries', 'classroom_guide'
  )),
  title_ar text not null,
  title_en text not null default '',
  description_ar text,
  url text not null,
  grade_id uuid not null references public.grades (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  is_coming_soon boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Legacy alias table (kept for older installs; prefer teacher_resources)
create table if not exists public.teacher_space_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'lesson_prep', 'worksheets', 'question_banks', 'grammar_summaries', 'classroom_guide'
  )),
  title_ar text not null,
  title_en text not null default '',
  description_ar text,
  url text not null,
  grade_id uuid references public.grades (id) on delete set null,
  unit_id uuid references public.units (id) on delete set null,
  is_coming_soon boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.teacher_space_items add column if not exists unit_id uuid references public.units (id) on delete set null;
alter table public.teacher_space_items add column if not exists is_coming_soon boolean not null default false;
alter table public.teacher_resources add column if not exists grade_id uuid references public.grades (id) on delete cascade;
alter table public.teacher_resources add column if not exists unit_id uuid references public.units (id) on delete cascade;
alter table public.teacher_resources add column if not exists is_coming_soon boolean not null default false;

-- Site settings
create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  logo_url text,
  phone_number text,
  whatsapp_number text,
  telegram_link text,
  social_links jsonb not null default '[]'::jsonb,
  hero_subtitle_ar text,
  hero_subtitle_en text,
  book_year_label text,
  admin_password text,
  updated_at timestamptz not null default now()
);
alter table public.site_settings add column if not exists admin_password text;
alter table public.site_settings add column if not exists hero_subtitle_ar text;
alter table public.site_settings add column if not exists hero_subtitle_en text;
alter table public.site_settings add column if not exists book_year_label text;

insert into public.site_settings (id, social_links, hero_subtitle_ar, hero_subtitle_en, book_year_label)
values (
  1,
  '[]'::jsonb,
  'منصتك التعليمية الشاملة للمنهج الليبي',
  'Your complete educational hub for the Libyan curriculum',
  '2026 - 2027'
)
on conflict (id) do nothing;

-- Storage bucket note: create public bucket "platform-assets" in Dashboard

-- RLS
alter table public.admin_users enable row level security;
alter table public.announcements enable row level security;
alter table public.grades enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;
alter table public.teacher_schedules enable row level security;
alter table public.teacher_resources enable row level security;
alter table public.teacher_space_items enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Allow all admin_users" on public.admin_users;
drop policy if exists "Allow all announcements" on public.announcements;
drop policy if exists "Allow all grades" on public.grades;
drop policy if exists "Allow all units" on public.units;
drop policy if exists "Allow all lessons" on public.lessons;
drop policy if exists "Allow all resources" on public.resources;
drop policy if exists "Allow all teacher_schedules" on public.teacher_schedules;
drop policy if exists "Allow all teacher_resources" on public.teacher_resources;
drop policy if exists "Allow all teacher_space_items" on public.teacher_space_items;
drop policy if exists "Allow all site_settings" on public.site_settings;

create policy "Allow all admin_users" on public.admin_users for all using (true) with check (true);
create policy "Allow all announcements" on public.announcements for all using (true) with check (true);
create policy "Allow all grades" on public.grades for all using (true) with check (true);
create policy "Allow all units" on public.units for all using (true) with check (true);
create policy "Allow all lessons" on public.lessons for all using (true) with check (true);
create policy "Allow all resources" on public.resources for all using (true) with check (true);
create policy "Allow all teacher_schedules" on public.teacher_schedules for all using (true) with check (true);
create policy "Allow all teacher_resources" on public.teacher_resources for all using (true) with check (true);
create policy "Allow all teacher_space_items" on public.teacher_space_items for all using (true) with check (true);
create policy "Allow all site_settings" on public.site_settings for all using (true) with check (true);
