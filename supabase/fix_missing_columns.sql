-- Run this in Supabase SQL Editor if queries fail on missing columns.
-- Safe to re-run (IF NOT EXISTS / defaults).
-- Aligns live DBs that still use legacy `title` / `file_url` with the app schema.

-- ── site_settings ──────────────────────────────────────────────
alter table public.site_settings
  add column if not exists schedules_enabled boolean not null default true;
alter table public.site_settings
  add column if not exists grade_calculator_enabled boolean not null default true;
alter table public.site_settings
  add column if not exists hero_subtitle_ar text;
alter table public.site_settings
  add column if not exists hero_subtitle_en text;
alter table public.site_settings
  add column if not exists book_year_label text;

-- ── grades ─────────────────────────────────────────────────────
alter table public.grades
  add column if not exists title_ar text;
alter table public.grades
  add column if not exists title_en text not null default '';
alter table public.grades
  add column if not exists sort_order integer not null default 0;
alter table public.grades
  add column if not exists is_coming_soon boolean not null default false;
alter table public.grades
  add column if not exists slug text;

-- Copy legacy `title` → `title_ar` when present
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'title'
  ) then
    update public.grades
    set title_ar = coalesce(nullif(title_ar, ''), title)
    where title_ar is null or title_ar = '';
  end if;
end $$;

-- ── units ──────────────────────────────────────────────────────
alter table public.units
  add column if not exists title_ar text;
alter table public.units
  add column if not exists title_en text not null default '';
alter table public.units
  add column if not exists sort_order integer not null default 0;
alter table public.units
  add column if not exists is_coming_soon boolean not null default false;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'units' and column_name = 'title'
  ) then
    update public.units
    set title_ar = coalesce(nullif(title_ar, ''), title)
    where title_ar is null or title_ar = '';
  end if;
end $$;

-- ── lessons ────────────────────────────────────────────────────
alter table public.lessons
  add column if not exists title_ar text;
alter table public.lessons
  add column if not exists title_en text not null default '';
alter table public.lessons
  add column if not exists sort_order integer not null default 0;
alter table public.lessons
  add column if not exists is_coming_soon boolean not null default false;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'title'
  ) then
    update public.lessons
    set title_ar = coalesce(nullif(title_ar, ''), title)
    where title_ar is null or title_ar = '';
  end if;
end $$;

-- ── resources ──────────────────────────────────────────────────
alter table public.resources
  add column if not exists title_ar text;
alter table public.resources
  add column if not exists title_en text not null default '';
alter table public.resources
  add column if not exists url text;
alter table public.resources
  add column if not exists unit_id uuid references public.units (id) on delete set null;
alter table public.resources
  add column if not exists lesson_id uuid references public.lessons (id) on delete set null;
alter table public.resources
  add column if not exists resource_category text;
alter table public.resources
  add column if not exists is_coming_soon boolean not null default false;
alter table public.resources
  add column if not exists subject_ar text not null default '';
alter table public.resources
  add column if not exists description_ar text;
alter table public.resources
  add column if not exists badge_color text not null default '#0f766e';
alter table public.resources
  add column if not exists icon_type text not null default 'file-text';
alter table public.resources
  add column if not exists cover_image_url text;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resources' and column_name = 'title'
  ) then
    update public.resources
    set title_ar = coalesce(nullif(title_ar, ''), title)
    where title_ar is null or title_ar = '';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resources' and column_name = 'file_url'
  ) then
    update public.resources
    set url = coalesce(nullif(url, ''), file_url)
    where url is null or url = '';
  end if;
end $$;

-- ── teacher_resources ──────────────────────────────────────────
alter table public.teacher_resources
  add column if not exists title_ar text;
alter table public.teacher_resources
  add column if not exists title_en text not null default '';
alter table public.teacher_resources
  add column if not exists url text;
alter table public.teacher_resources
  add column if not exists grade_id uuid references public.grades (id) on delete set null;
alter table public.teacher_resources
  add column if not exists unit_id uuid references public.units (id) on delete set null;
alter table public.teacher_resources
  add column if not exists is_active boolean not null default true;
alter table public.teacher_resources
  add column if not exists is_coming_soon boolean not null default false;
alter table public.teacher_resources
  add column if not exists sort_order integer not null default 0;
alter table public.teacher_resources
  add column if not exists description_ar text;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teacher_resources' and column_name = 'title'
  ) then
    update public.teacher_resources
    set title_ar = coalesce(nullif(title_ar, ''), title)
    where title_ar is null or title_ar = '';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teacher_resources' and column_name = 'file_url'
  ) then
    update public.teacher_resources
    set url = coalesce(nullif(url, ''), file_url)
    where url is null or url = '';
  end if;
end $$;

update public.site_settings
set
  schedules_enabled = coalesce(schedules_enabled, true),
  grade_calculator_enabled = coalesce(grade_calculator_enabled, true)
where id = 1;
