-- Run this in Supabase SQL Editor if queries fail on missing columns.
-- Safe to re-run (IF NOT EXISTS / defaults).

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

alter table public.units
  add column if not exists title_en text not null default '';
alter table public.units
  add column if not exists sort_order integer not null default 0;
alter table public.units
  add column if not exists is_coming_soon boolean not null default false;

alter table public.lessons
  add column if not exists title_en text not null default '';
alter table public.lessons
  add column if not exists sort_order integer not null default 0;
alter table public.lessons
  add column if not exists is_coming_soon boolean not null default false;

alter table public.grades
  add column if not exists title_en text not null default '';
alter table public.grades
  add column if not exists sort_order integer not null default 0;
alter table public.grades
  add column if not exists is_coming_soon boolean not null default false;

alter table public.resources
  add column if not exists unit_id uuid references public.units (id) on delete set null;
alter table public.resources
  add column if not exists lesson_id uuid references public.lessons (id) on delete set null;
alter table public.resources
  add column if not exists resource_category text;
alter table public.resources
  add column if not exists is_coming_soon boolean not null default false;
alter table public.resources
  add column if not exists title_en text not null default '';

alter table public.teacher_resources
  add column if not exists title_en text not null default '';
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

update public.site_settings
set
  schedules_enabled = coalesce(schedules_enabled, true),
  grade_calculator_enabled = coalesce(grade_calculator_enabled, true)
where id = 1;
