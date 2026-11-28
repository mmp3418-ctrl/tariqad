-- =============================================================================
-- tariq-admin — Unified idempotent schema (subjects / materials / playlists /
-- teacher references / PDF Storage)
-- Matches exact table + column + bucket names used by the current codebase.
-- Safe to re-run in Supabase SQL Editor.
--
-- IMPORTANT: Live DBs may have legacy text/varchar FK columns (stage_id,
-- grade_id, subject_id, …) while parent PKs are uuid. This script coerces
-- those columns to uuid BEFORE adding foreign keys (avoids ERROR 42804).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helper: ensure a column exists as uuid (add or safely cast from text/etc.)
-- Drops outbound FK constraints on that column first; clears invalid values.
-- ---------------------------------------------------------------------------
create or replace function public._tariq_ensure_uuid_column(
  p_table regclass,
  p_column text
) returns void
language plpgsql
as $$
declare
  v_attnum int;
  v_udt text;
  v_con record;
  v_has_default boolean;
begin
  select a.attnum, format_type(a.atttypid, a.atttypmod)
    into v_attnum, v_udt
  from pg_attribute a
  where a.attrelid = p_table
    and a.attname = p_column
    and not a.attisdropped
    and a.attnum > 0;

  if v_attnum is null then
    execute format('alter table %s add column %I uuid', p_table, p_column);
    return;
  end if;

  -- Already uuid — nothing to do
  if v_udt = 'uuid' then
    return;
  end if;

  -- Drop any FK constraints that use this column as the local side
  for v_con in
    select c.conname
    from pg_constraint c
    where c.conrelid = p_table
      and c.contype = 'f'
      and v_attnum = any (c.conkey)
  loop
    execute format('alter table %s drop constraint if exists %I', p_table, v_con.conname);
  end loop;

  -- Drop default if present (e.g. '' is invalid for uuid)
  select (a.atthasdef and not a.attisdropped)
    into v_has_default
  from pg_attribute a
  where a.attrelid = p_table and a.attname = p_column;

  if coalesce(v_has_default, false) then
    execute format('alter table %s alter column %I drop default', p_table, p_column);
  end if;

  -- Allow nulls during conversion (NOT NULL + bad rows would block cast)
  begin
    execute format('alter table %s alter column %I drop not null', p_table, p_column);
  exception
    when others then
      null;
  end;

  -- Clear blank / non-UUID textual values before cast
  execute format(
    $sql$
      update %s
      set %I = null
      where %I is not null
        and (
          btrim(%I::text) = ''
          or btrim(%I::text) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
    $sql$,
    p_table, p_column, p_column, p_column, p_column
  );

  execute format(
    $sql$
      alter table %s
        alter column %I type uuid
        using (
          case
            when %I is null then null
            when btrim(%I::text) = '' then null
            else btrim(%I::text)::uuid
          end
        )
    $sql$,
    p_table, p_column, p_column, p_column, p_column
  );
end;
$$;

-- Helper: null orphan FK values so ADD CONSTRAINT succeeds
create or replace function public._tariq_null_orphan_fk(
  p_child regclass,
  p_child_col text,
  p_parent regclass,
  p_parent_col text default 'id'
) returns void
language plpgsql
as $$
begin
  -- No-op if either column missing
  if to_regclass(p_child::text) is null or to_regclass(p_parent::text) is null then
    return;
  end if;

  if not exists (
    select 1 from pg_attribute
    where attrelid = p_child and attname = p_child_col and not attisdropped and attnum > 0
  ) then
    return;
  end if;

  execute format(
    $sql$
      update %s as child
      set %I = null
      where child.%I is not null
        and not exists (
          select 1 from %s as parent
          where parent.%I = child.%I
        )
    $sql$,
    p_child, p_child_col, p_child_col, p_parent, p_parent_col, p_child_col
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Dependencies: academic_stages / academic_grades
-- ---------------------------------------------------------------------------
create table if not exists public.academic_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academic_stages add column if not exists name text;
alter table public.academic_stages add column if not exists sort_order integer not null default 0;
alter table public.academic_stages add column if not exists is_active boolean not null default true;
alter table public.academic_stages add column if not exists created_at timestamptz not null default now();
alter table public.academic_stages add column if not exists updated_at timestamptz not null default now();

create table if not exists public.academic_grades (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academic_grades add column if not exists stage_id uuid;
alter table public.academic_grades add column if not exists name text;
alter table public.academic_grades add column if not exists sort_order integer not null default 0;
alter table public.academic_grades add column if not exists is_active boolean not null default true;
alter table public.academic_grades add column if not exists created_at timestamptz not null default now();
alter table public.academic_grades add column if not exists updated_at timestamptz not null default now();

-- Coerce FK only (never rewrite primary keys — inbound FKs would break)
select public._tariq_ensure_uuid_column('public.academic_grades'::regclass, 'stage_id');

alter table public.academic_stages enable row level security;
alter table public.academic_grades enable row level security;

drop policy if exists "Allow all academic_stages" on public.academic_stages;
create policy "Allow all academic_stages"
  on public.academic_stages for all using (true) with check (true);

drop policy if exists "Allow all academic_grades" on public.academic_grades;
create policy "Allow all academic_grades"
  on public.academic_grades for all using (true) with check (true);

create index if not exists academic_stages_sort_idx
  on public.academic_stages (sort_order asc, created_at asc);
create index if not exists academic_grades_stage_idx
  on public.academic_grades (stage_id, sort_order asc);

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid,
  grade_id uuid,
  name text,
  name_ar text not null default '',
  name_en text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subjects add column if not exists stage_id uuid;
alter table public.subjects add column if not exists grade_id uuid;
alter table public.subjects add column if not exists name text;
alter table public.subjects add column if not exists name_ar text;
alter table public.subjects add column if not exists name_en text;
alter table public.subjects add column if not exists sort_order integer not null default 0;
alter table public.subjects add column if not exists is_active boolean not null default true;
alter table public.subjects add column if not exists created_at timestamptz not null default now();
alter table public.subjects add column if not exists updated_at timestamptz not null default now();

select public._tariq_ensure_uuid_column('public.subjects'::regclass, 'stage_id');
select public._tariq_ensure_uuid_column('public.subjects'::regclass, 'grade_id');

-- Legacy text columns still present on some live DBs (NOT NULL "stage"/"grade").
-- App writes BOTH pairs; keep legacy columns in sync and relax NOT NULL so
-- inserts that only set stage_id/grade_id no longer fail with 23502.
alter table public.subjects add column if not exists stage text;
alter table public.subjects add column if not exists grade text;

update public.subjects
set stage = coalesce(nullif(btrim(stage), ''), stage_id::text)
where stage_id is not null
  and (stage is null or btrim(stage) = '');

update public.subjects
set grade = coalesce(nullif(btrim(grade), ''), grade_id::text)
where grade_id is not null
  and (grade is null or btrim(grade) = '');

-- Backfill uuid FKs from legacy text when they hold UUID strings
do $$
begin
  update public.subjects
  set stage_id = stage::uuid
  where stage_id is null
    and stage is not null
    and btrim(stage) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  update public.subjects
  set grade_id = grade::uuid
  where grade_id is null
    and grade is not null
    and btrim(grade) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
exception
  when others then
    raise notice 'subjects legacy backfill skipped: %', sqlerrm;
end $$;

-- Relax legacy NOT NULL so uuid-only writes never fail with 23502
do $$
begin
  alter table public.subjects alter column stage drop not null;
exception
  when undefined_column then null;
  when others then
    raise notice 'subjects.stage drop not null: %', sqlerrm;
end $$;

do $$
begin
  alter table public.subjects alter column grade drop not null;
exception
  when undefined_column then null;
  when others then
    raise notice 'subjects.grade drop not null: %', sqlerrm;
end $$;

update public.subjects set name_en = coalesce(name_en, '') where name_en is null;
alter table public.subjects alter column name_en set default '';

alter table public.subjects enable row level security;
drop policy if exists "Allow all subjects" on public.subjects;
create policy "Allow all subjects"
  on public.subjects for all using (true) with check (true);

create index if not exists subjects_grade_sort_idx
  on public.subjects (grade_id, sort_order asc);
create index if not exists subjects_stage_grade_idx
  on public.subjects (stage_id, grade_id, name_ar);

-- ---------------------------------------------------------------------------
-- educational_materials (PDF files)
-- ---------------------------------------------------------------------------
create table if not exists public.educational_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  material_type text not null,
  file_url text,
  pdf_url text,
  file_path text,
  unit_name text,
  stage_id uuid,
  grade_id uuid,
  subject_id uuid,
  unit_id uuid,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.educational_materials add column if not exists title text;
alter table public.educational_materials add column if not exists material_type text;
alter table public.educational_materials add column if not exists file_url text;
alter table public.educational_materials add column if not exists pdf_url text;
alter table public.educational_materials add column if not exists file_path text;
alter table public.educational_materials add column if not exists unit_name text;
alter table public.educational_materials add column if not exists stage_id uuid;
alter table public.educational_materials add column if not exists grade_id uuid;
alter table public.educational_materials add column if not exists subject_id uuid;
alter table public.educational_materials add column if not exists unit_id uuid;
alter table public.educational_materials add column if not exists is_active boolean not null default true;
alter table public.educational_materials add column if not exists sort_order integer not null default 0;
alter table public.educational_materials add column if not exists created_at timestamptz not null default now();
alter table public.educational_materials add column if not exists updated_at timestamptz not null default now();

select public._tariq_ensure_uuid_column('public.educational_materials'::regclass, 'stage_id');
select public._tariq_ensure_uuid_column('public.educational_materials'::regclass, 'grade_id');
select public._tariq_ensure_uuid_column('public.educational_materials'::regclass, 'subject_id');
select public._tariq_ensure_uuid_column('public.educational_materials'::regclass, 'unit_id');

update public.educational_materials
set file_url = coalesce(nullif(file_url, ''), nullif(file_path, ''), nullif(pdf_url, ''))
where coalesce(file_url, '') = '';

alter table public.educational_materials enable row level security;
drop policy if exists "Allow all educational_materials" on public.educational_materials;
create policy "Allow all educational_materials"
  on public.educational_materials for all using (true) with check (true);

create index if not exists educational_materials_sort_idx
  on public.educational_materials (sort_order asc, created_at desc);
create index if not exists educational_materials_subject_idx
  on public.educational_materials (subject_id);
create index if not exists educational_materials_stage_grade_idx
  on public.educational_materials (stage_id, grade_id);

-- ---------------------------------------------------------------------------
-- video_playlists
-- ---------------------------------------------------------------------------
create table if not exists public.video_playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  playlist_url text,
  youtube_url text,
  unit_name text,
  material_type text,
  cover_image_url text,
  stage_id uuid,
  grade_id uuid,
  subject_id uuid,
  unit_id uuid,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.video_playlists add column if not exists title text;
alter table public.video_playlists add column if not exists playlist_url text;
alter table public.video_playlists add column if not exists youtube_url text;
alter table public.video_playlists add column if not exists unit_name text;
alter table public.video_playlists add column if not exists material_type text;
alter table public.video_playlists add column if not exists cover_image_url text;
alter table public.video_playlists add column if not exists stage_id uuid;
alter table public.video_playlists add column if not exists grade_id uuid;
alter table public.video_playlists add column if not exists subject_id uuid;
alter table public.video_playlists add column if not exists unit_id uuid;
alter table public.video_playlists add column if not exists is_active boolean not null default true;
alter table public.video_playlists add column if not exists sort_order integer not null default 0;
alter table public.video_playlists add column if not exists created_at timestamptz not null default now();
alter table public.video_playlists add column if not exists updated_at timestamptz not null default now();

select public._tariq_ensure_uuid_column('public.video_playlists'::regclass, 'stage_id');
select public._tariq_ensure_uuid_column('public.video_playlists'::regclass, 'grade_id');
select public._tariq_ensure_uuid_column('public.video_playlists'::regclass, 'subject_id');
select public._tariq_ensure_uuid_column('public.video_playlists'::regclass, 'unit_id');

update public.video_playlists
set playlist_url = coalesce(nullif(playlist_url, ''), nullif(youtube_url, ''))
where coalesce(playlist_url, '') = '';

alter table public.video_playlists enable row level security;
drop policy if exists "Allow all video_playlists" on public.video_playlists;
create policy "Allow all video_playlists"
  on public.video_playlists for all using (true) with check (true);

create index if not exists video_playlists_sort_idx
  on public.video_playlists (sort_order asc, created_at desc);
create index if not exists video_playlists_subject_idx
  on public.video_playlists (subject_id);
create index if not exists video_playlists_stage_grade_idx
  on public.video_playlists (stage_id, grade_id);

-- ---------------------------------------------------------------------------
-- teacher_references (PDF references — same Storage upload path as materials)
-- Live installs often have stage_id/grade_id as text — coerce before FKs.
-- ---------------------------------------------------------------------------
create table if not exists public.teacher_references (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text not null default '',
  stage_id uuid,
  grade_id uuid,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_references add column if not exists title text;
alter table public.teacher_references add column if not exists description text;
alter table public.teacher_references add column if not exists file_url text;
alter table public.teacher_references add column if not exists stage_id uuid;
alter table public.teacher_references add column if not exists grade_id uuid;
alter table public.teacher_references add column if not exists is_active boolean not null default true;
alter table public.teacher_references add column if not exists sort_order integer not null default 0;
alter table public.teacher_references add column if not exists created_at timestamptz not null default now();
alter table public.teacher_references add column if not exists updated_at timestamptz not null default now();

select public._tariq_ensure_uuid_column('public.teacher_references'::regclass, 'stage_id');
select public._tariq_ensure_uuid_column('public.teacher_references'::regclass, 'grade_id');

alter table public.teacher_references enable row level security;
drop policy if exists "Allow all teacher_references" on public.teacher_references;
create policy "Allow all teacher_references"
  on public.teacher_references for all using (true) with check (true);

create index if not exists teacher_references_stage_grade_idx
  on public.teacher_references (stage_id, grade_id);

-- Also harden related teacher-space FK columns when those tables exist
do $$
begin
  if to_regclass('public.teacher_tutorials') is not null then
    perform public._tariq_ensure_uuid_column('public.teacher_tutorials'::regclass, 'stage_id');
    perform public._tariq_ensure_uuid_column('public.teacher_tutorials'::regclass, 'grade_id');
  end if;
  if to_regclass('public.teacher_timetables') is not null then
    perform public._tariq_ensure_uuid_column('public.teacher_timetables'::regclass, 'stage_id');
    perform public._tariq_ensure_uuid_column('public.teacher_timetables'::regclass, 'grade_id');
  end if;
  if to_regclass('public.question_bank') is not null then
    perform public._tariq_ensure_uuid_column('public.question_bank'::regclass, 'stage_id');
    perform public._tariq_ensure_uuid_column('public.question_bank'::regclass, 'grade_id');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Null orphans, then (re)create foreign keys
-- ---------------------------------------------------------------------------
-- grades.stage_id is NOT NULL — remove orphan/empty rows instead of nulling
delete from public.academic_grades g
where g.stage_id is null
   or not exists (
     select 1 from public.academic_stages s where s.id = g.stage_id
   );

select public._tariq_null_orphan_fk('public.subjects'::regclass, 'stage_id', 'public.academic_stages'::regclass);
select public._tariq_null_orphan_fk('public.subjects'::regclass, 'grade_id', 'public.academic_grades'::regclass);
select public._tariq_null_orphan_fk('public.educational_materials'::regclass, 'stage_id', 'public.academic_stages'::regclass);
select public._tariq_null_orphan_fk('public.educational_materials'::regclass, 'grade_id', 'public.academic_grades'::regclass);
select public._tariq_null_orphan_fk('public.educational_materials'::regclass, 'subject_id', 'public.subjects'::regclass);
select public._tariq_null_orphan_fk('public.video_playlists'::regclass, 'stage_id', 'public.academic_stages'::regclass);
select public._tariq_null_orphan_fk('public.video_playlists'::regclass, 'grade_id', 'public.academic_grades'::regclass);
select public._tariq_null_orphan_fk('public.video_playlists'::regclass, 'subject_id', 'public.subjects'::regclass);
select public._tariq_null_orphan_fk('public.teacher_references'::regclass, 'stage_id', 'public.academic_stages'::regclass);
select public._tariq_null_orphan_fk('public.teacher_references'::regclass, 'grade_id', 'public.academic_grades'::regclass);

do $$
begin
  if to_regclass('public.teacher_tutorials') is not null then
    perform public._tariq_null_orphan_fk('public.teacher_tutorials'::regclass, 'stage_id', 'public.academic_stages'::regclass);
    perform public._tariq_null_orphan_fk('public.teacher_tutorials'::regclass, 'grade_id', 'public.academic_grades'::regclass);
  end if;
  if to_regclass('public.teacher_timetables') is not null then
    perform public._tariq_null_orphan_fk('public.teacher_timetables'::regclass, 'stage_id', 'public.academic_stages'::regclass);
    perform public._tariq_null_orphan_fk('public.teacher_timetables'::regclass, 'grade_id', 'public.academic_grades'::regclass);
  end if;
  if to_regclass('public.question_bank') is not null then
    perform public._tariq_null_orphan_fk('public.question_bank'::regclass, 'stage_id', 'public.academic_stages'::regclass);
    perform public._tariq_null_orphan_fk('public.question_bank'::regclass, 'grade_id', 'public.academic_grades'::regclass);
  end if;
end $$;

alter table public.academic_grades drop constraint if exists academic_grades_stage_id_fkey;
alter table public.academic_grades
  add constraint academic_grades_stage_id_fkey
  foreign key (stage_id) references public.academic_stages(id) on delete cascade;

alter table public.subjects drop constraint if exists subjects_stage_id_fkey;
alter table public.subjects
  add constraint subjects_stage_id_fkey
  foreign key (stage_id) references public.academic_stages(id) on delete set null;

alter table public.subjects drop constraint if exists subjects_grade_id_fkey;
alter table public.subjects
  add constraint subjects_grade_id_fkey
  foreign key (grade_id) references public.academic_grades(id) on delete cascade;

alter table public.educational_materials drop constraint if exists educational_materials_stage_id_fkey;
alter table public.educational_materials
  add constraint educational_materials_stage_id_fkey
  foreign key (stage_id) references public.academic_stages(id) on delete set null;

alter table public.educational_materials drop constraint if exists educational_materials_grade_id_fkey;
alter table public.educational_materials
  add constraint educational_materials_grade_id_fkey
  foreign key (grade_id) references public.academic_grades(id) on delete set null;

alter table public.educational_materials drop constraint if exists educational_materials_subject_id_fkey;
alter table public.educational_materials
  add constraint educational_materials_subject_id_fkey
  foreign key (subject_id) references public.subjects(id) on delete set null;

alter table public.video_playlists drop constraint if exists video_playlists_stage_id_fkey;
alter table public.video_playlists
  add constraint video_playlists_stage_id_fkey
  foreign key (stage_id) references public.academic_stages(id) on delete set null;

alter table public.video_playlists drop constraint if exists video_playlists_grade_id_fkey;
alter table public.video_playlists
  add constraint video_playlists_grade_id_fkey
  foreign key (grade_id) references public.academic_grades(id) on delete set null;

alter table public.video_playlists drop constraint if exists video_playlists_subject_id_fkey;
alter table public.video_playlists
  add constraint video_playlists_subject_id_fkey
  foreign key (subject_id) references public.subjects(id) on delete set null;

alter table public.teacher_references drop constraint if exists teacher_references_stage_id_fkey;
alter table public.teacher_references
  add constraint teacher_references_stage_id_fkey
  foreign key (stage_id) references public.academic_stages(id) on delete set null;

alter table public.teacher_references drop constraint if exists teacher_references_grade_id_fkey;
alter table public.teacher_references
  add constraint teacher_references_grade_id_fkey
  foreign key (grade_id) references public.academic_grades(id) on delete set null;

do $$
begin
  if to_regclass('public.teacher_tutorials') is not null then
    alter table public.teacher_tutorials drop constraint if exists teacher_tutorials_stage_id_fkey;
    alter table public.teacher_tutorials
      add constraint teacher_tutorials_stage_id_fkey
      foreign key (stage_id) references public.academic_stages(id) on delete set null;
    alter table public.teacher_tutorials drop constraint if exists teacher_tutorials_grade_id_fkey;
    alter table public.teacher_tutorials
      add constraint teacher_tutorials_grade_id_fkey
      foreign key (grade_id) references public.academic_grades(id) on delete set null;
  end if;

  if to_regclass('public.teacher_timetables') is not null then
    alter table public.teacher_timetables drop constraint if exists teacher_timetables_stage_id_fkey;
    alter table public.teacher_timetables
      add constraint teacher_timetables_stage_id_fkey
      foreign key (stage_id) references public.academic_stages(id) on delete set null;
    alter table public.teacher_timetables drop constraint if exists teacher_timetables_grade_id_fkey;
    alter table public.teacher_timetables
      add constraint teacher_timetables_grade_id_fkey
      foreign key (grade_id) references public.academic_grades(id) on delete set null;
  end if;

  if to_regclass('public.question_bank') is not null then
    alter table public.question_bank drop constraint if exists question_bank_stage_id_fkey;
    alter table public.question_bank
      add constraint question_bank_stage_id_fkey
      foreign key (stage_id) references public.academic_stages(id) on delete set null;
    alter table public.question_bank drop constraint if exists question_bank_grade_id_fkey;
    alter table public.question_bank
      add constraint question_bank_grade_id_fkey
      foreign key (grade_id) references public.academic_grades(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage buckets used by lib/storage.ts + lib/academic.ts
-- Order in code: pdfs → uploads → materials
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read pdfs" on storage.objects;
create policy "Public read pdfs"
  on storage.objects for select
  using (bucket_id in ('pdfs', 'uploads', 'materials'));

drop policy if exists "Public upload pdfs" on storage.objects;
create policy "Public upload pdfs"
  on storage.objects for insert
  with check (bucket_id in ('pdfs', 'uploads', 'materials'));

drop policy if exists "Public update pdfs" on storage.objects;
create policy "Public update pdfs"
  on storage.objects for update
  using (bucket_id in ('pdfs', 'uploads', 'materials'))
  with check (bucket_id in ('pdfs', 'uploads', 'materials'));

drop policy if exists "Public delete pdfs" on storage.objects;
create policy "Public delete pdfs"
  on storage.objects for delete
  using (bucket_id in ('pdfs', 'uploads', 'materials'));

-- ---------------------------------------------------------------------------
-- Cleanup helpers (optional — leave installed for re-runs, or drop)
-- ---------------------------------------------------------------------------
drop function if exists public._tariq_null_orphan_fk(regclass, text, regclass, text);
drop function if exists public._tariq_ensure_uuid_column(regclass, text);
