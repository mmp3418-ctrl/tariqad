-- Align live DB with the app's active write columns.
-- Canonical columns: title, file_url, description, order_index
-- Safe to re-run.

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
alter table public.grades add column if not exists title text;
alter table public.grades add column if not exists order_index integer not null default 0;
alter table public.grades add column if not exists sort_order integer not null default 0;
alter table public.grades add column if not exists is_coming_soon boolean not null default false;
alter table public.grades add column if not exists slug text;
alter table public.grades add column if not exists stage text;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='grades' and column_name='title_ar'
  ) then
    update public.grades
    set title = coalesce(nullif(title, ''), title_ar)
    where title is null or title = '';
  end if;
  update public.grades
  set order_index = coalesce(nullif(order_index, 0), sort_order, 0)
  where order_index = 0 and sort_order is not null and sort_order <> 0;
end $$;

-- ── units ──────────────────────────────────────────────────────
alter table public.units add column if not exists title text;
alter table public.units add column if not exists order_index integer not null default 0;
alter table public.units add column if not exists sort_order integer not null default 0;
alter table public.units add column if not exists is_coming_soon boolean not null default false;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='units' and column_name='title_ar'
  ) then
    update public.units
    set title = coalesce(nullif(title, ''), title_ar)
    where title is null or title = '';
  end if;
end $$;

-- ── lessons ────────────────────────────────────────────────────
alter table public.lessons add column if not exists title text;
alter table public.lessons add column if not exists order_index integer not null default 0;
alter table public.lessons add column if not exists sort_order integer not null default 0;
alter table public.lessons add column if not exists is_coming_soon boolean not null default false;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='lessons' and column_name='title_ar'
  ) then
    update public.lessons
    set title = coalesce(nullif(title, ''), title_ar)
    where title is null or title = '';
  end if;
end $$;

-- ── resources ──────────────────────────────────────────────────
alter table public.resources add column if not exists title text;
alter table public.resources add column if not exists file_url text;
alter table public.resources add column if not exists description text;
alter table public.resources add column if not exists order_index integer not null default 0;
alter table public.resources add column if not exists sort_order integer not null default 0;
alter table public.resources add column if not exists unit_id uuid references public.units (id) on delete set null;
alter table public.resources add column if not exists lesson_id uuid references public.lessons (id) on delete set null;
alter table public.resources add column if not exists resource_category text;
alter table public.resources add column if not exists is_coming_soon boolean not null default false;
alter table public.resources add column if not exists type text;
alter table public.resources add column if not exists target_audience text;
alter table public.resources add column if not exists question_data jsonb;

do $$ begin
  -- optional check constraint for target_audience
  begin
    alter table public.resources
      drop constraint if exists resources_target_audience_check;
  exception when undefined_object then null;
  end;
  begin
    alter table public.resources
      add constraint resources_target_audience_check
      check (target_audience is null or target_audience in ('student', 'teacher'));
  exception when others then null;
  end;
end $$;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='resources' and column_name='title_ar'
  ) then
    update public.resources
    set title = coalesce(nullif(title, ''), title_ar)
    where title is null or title = '';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='resources' and column_name='url'
  ) then
    update public.resources
    set file_url = coalesce(nullif(file_url, ''), url)
    where file_url is null or file_url = '';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='resources' and column_name='description_ar'
  ) then
    update public.resources
    set description = coalesce(nullif(description, ''), description_ar)
    where description is null or description = '';
  end if;
end $$;

-- ── teacher_resources ──────────────────────────────────────────
alter table public.teacher_resources add column if not exists title text;
alter table public.teacher_resources add column if not exists file_url text;
alter table public.teacher_resources add column if not exists description text;
alter table public.teacher_resources add column if not exists order_index integer not null default 0;
alter table public.teacher_resources add column if not exists sort_order integer not null default 0;
alter table public.teacher_resources add column if not exists grade_id uuid references public.grades (id) on delete set null;
alter table public.teacher_resources add column if not exists unit_id uuid references public.units (id) on delete set null;
alter table public.teacher_resources add column if not exists is_active boolean not null default true;
alter table public.teacher_resources add column if not exists is_coming_soon boolean not null default false;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='teacher_resources' and column_name='title_ar'
  ) then
    update public.teacher_resources
    set title = coalesce(nullif(title, ''), title_ar)
    where title is null or title = '';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='teacher_resources' and column_name='url'
  ) then
    update public.teacher_resources
    set file_url = coalesce(nullif(file_url, ''), url)
    where file_url is null or file_url = '';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='teacher_resources' and column_name='description_ar'
  ) then
    update public.teacher_resources
    set description = coalesce(nullif(description, ''), description_ar)
    where description is null or description = '';
  end if;
end $$;

-- Storage: create a PUBLIC bucket named "uploads" in Supabase Dashboard
-- (Dashboard → Storage → New bucket → Public)

update public.site_settings
set
  schedules_enabled = coalesce(schedules_enabled, true),
  grade_calculator_enabled = coalesce(grade_calculator_enabled, true)
where id = 1;
