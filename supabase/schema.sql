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


-- ---------------------------------------------------------------------------
-- home_content: single-row homepage copy (id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.home_content (
  id integer primary key check (id = 1),
  hero_title text,
  hero_subtitle text,
  hero_cta_text text,
  hero_cta_url text,
  about_text text,
  updated_at timestamptz not null default now()
);

alter table public.home_content add column if not exists hero_title text;
alter table public.home_content add column if not exists hero_subtitle text;
alter table public.home_content add column if not exists hero_cta_text text;
alter table public.home_content add column if not exists hero_cta_url text;
alter table public.home_content add column if not exists about_text text;
alter table public.home_content add column if not exists updated_at timestamptz not null default now();

insert into public.home_content (id)
values (1)
on conflict (id) do nothing;

alter table public.home_content enable row level security;

drop policy if exists "Allow all home_content" on public.home_content;
create policy "Allow all home_content"
  on public.home_content
  for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- books: publications catalog (active rows shown on hub)
-- ---------------------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_image text,
  download_url text,
  price text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books add column if not exists title text;
alter table public.books add column if not exists description text;
alter table public.books add column if not exists cover_image text;
alter table public.books add column if not exists download_url text;
alter table public.books add column if not exists price text;
alter table public.books add column if not exists is_active boolean not null default true;
alter table public.books add column if not exists sort_order integer not null default 0;
alter table public.books add column if not exists created_at timestamptz not null default now();
alter table public.books add column if not exists updated_at timestamptz not null default now();

alter table public.books enable row level security;

drop policy if exists "Allow all books" on public.books;
create policy "Allow all books"
  on public.books
  for all
  using (true)
  with check (true);

create index if not exists books_sort_idx
  on public.books (sort_order asc, created_at asc);

-- ---------------------------------------------------------------------------
-- Curriculum: grades → units → lessons + resources (PDF / playlist)
-- ---------------------------------------------------------------------------
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  stage text not null check (stage in ('primary', 'preparatory', 'secondary')),
  title_ar text not null,
  title_en text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  is_coming_soon boolean not null default false
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades(id) on delete cascade,
  title text,
  title_ar text,
  title_en text,
  sort_order integer not null default 0,
  is_coming_soon boolean not null default false
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  title text,
  title_ar text,
  title_en text,
  sort_order integer not null default 0,
  is_coming_soon boolean not null default false
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  type text not null check (type in ('pdf', 'playlist', 'video')),
  title_ar text not null,
  title_en text not null,
  subject_ar text not null default '',
  subject_en text not null default '',
  term text,
  url text not null,
  description text,
  description_ar text,
  description_en text,
  resource_category text,
  cover_image_url text,
  cover_image text,
  card_color text,
  badge_color text,
  icon_type text,
  icon_name text,
  is_coming_soon boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists units_grade_idx on public.units (grade_id, sort_order);
create index if not exists lessons_unit_idx on public.lessons (unit_id, sort_order);
create index if not exists resources_grade_unit_idx on public.resources (grade_id, unit_id);

alter table public.grades enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;

drop policy if exists "Allow all grades" on public.grades;
create policy "Allow all grades" on public.grades for all using (true) with check (true);

drop policy if exists "Allow all units" on public.units;
create policy "Allow all units" on public.units for all using (true) with check (true);

drop policy if exists "Allow all lessons" on public.lessons;
create policy "Allow all lessons" on public.lessons for all using (true) with check (true);

drop policy if exists "Allow all resources" on public.resources;
create policy "Allow all resources" on public.resources for all using (true) with check (true);


-- ---------------------------------------------------------------------------
-- academic_stages → academic_grades → academic_units
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
  stage_id uuid not null references public.academic_stages(id) on delete cascade,
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

create table if not exists public.academic_units (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.academic_grades(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academic_units add column if not exists grade_id uuid;
alter table public.academic_units add column if not exists name text;
alter table public.academic_units add column if not exists sort_order integer not null default 0;
alter table public.academic_units add column if not exists is_active boolean not null default true;
alter table public.academic_units add column if not exists created_at timestamptz not null default now();
alter table public.academic_units add column if not exists updated_at timestamptz not null default now();

alter table public.academic_stages enable row level security;
alter table public.academic_grades enable row level security;
alter table public.academic_units enable row level security;

drop policy if exists "Allow all academic_stages" on public.academic_stages;
create policy "Allow all academic_stages" on public.academic_stages for all using (true) with check (true);

drop policy if exists "Allow all academic_grades" on public.academic_grades;
create policy "Allow all academic_grades" on public.academic_grades for all using (true) with check (true);

drop policy if exists "Allow all academic_units" on public.academic_units;
create policy "Allow all academic_units" on public.academic_units for all using (true) with check (true);

create index if not exists academic_stages_sort_idx on public.academic_stages (sort_order asc, created_at asc);
create index if not exists academic_grades_stage_idx on public.academic_grades (stage_id, sort_order asc);
create index if not exists academic_units_grade_idx on public.academic_units (grade_id, sort_order asc);

-- ---------------------------------------------------------------------------
-- educational_materials (PDFs: book / note / worksheet)
-- ---------------------------------------------------------------------------
create table if not exists public.educational_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  material_type text not null,
  pdf_url text not null,
  stage_id uuid references public.academic_stages(id) on delete set null,
  grade_id uuid references public.academic_grades(id) on delete set null,
  unit_id uuid references public.academic_units(id) on delete set null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.educational_materials add column if not exists title text;
alter table public.educational_materials add column if not exists material_type text;
alter table public.educational_materials add column if not exists pdf_url text;
alter table public.educational_materials add column if not exists stage_id uuid;
alter table public.educational_materials add column if not exists grade_id uuid;
alter table public.educational_materials add column if not exists unit_id uuid;
alter table public.educational_materials add column if not exists is_active boolean not null default true;
alter table public.educational_materials add column if not exists sort_order integer not null default 0;
alter table public.educational_materials add column if not exists created_at timestamptz not null default now();
alter table public.educational_materials add column if not exists updated_at timestamptz not null default now();

alter table public.educational_materials enable row level security;
drop policy if exists "Allow all educational_materials" on public.educational_materials;
create policy "Allow all educational_materials" on public.educational_materials for all using (true) with check (true);

create index if not exists educational_materials_sort_idx
  on public.educational_materials (sort_order asc, created_at desc);

-- ---------------------------------------------------------------------------
-- video_playlists (YouTube educational playlists)
-- ---------------------------------------------------------------------------
create table if not exists public.video_playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  stage_id uuid references public.academic_stages(id) on delete set null,
  grade_id uuid references public.academic_grades(id) on delete set null,
  unit_id uuid references public.academic_units(id) on delete set null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.video_playlists add column if not exists title text;
alter table public.video_playlists add column if not exists youtube_url text;
alter table public.video_playlists add column if not exists stage_id uuid;
alter table public.video_playlists add column if not exists grade_id uuid;
alter table public.video_playlists add column if not exists unit_id uuid;
alter table public.video_playlists add column if not exists is_active boolean not null default true;
alter table public.video_playlists add column if not exists sort_order integer not null default 0;
alter table public.video_playlists add column if not exists created_at timestamptz not null default now();
alter table public.video_playlists add column if not exists updated_at timestamptz not null default now();

alter table public.video_playlists enable row level security;
drop policy if exists "Allow all video_playlists" on public.video_playlists;
create policy "Allow all video_playlists" on public.video_playlists for all using (true) with check (true);

create index if not exists video_playlists_sort_idx
  on public.video_playlists (sort_order asc, created_at desc);


-- ---------------------------------------------------------------------------
-- educational_materials: unit_name (manual) + file_path (Storage URL)
-- ---------------------------------------------------------------------------
alter table public.educational_materials add column if not exists unit_name text;
alter table public.educational_materials add column if not exists file_path text;

-- Drop legacy English type check if present (ignore errors in SQL editor if missing)
alter table public.educational_materials drop constraint if exists educational_materials_material_type_check;

-- Optional: keep pdf_url for older rows; prefer file_path going forward
alter table public.educational_materials add column if not exists pdf_url text;

-- ---------------------------------------------------------------------------
-- Storage buckets: pdfs (preferred) + uploads (fallback)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read pdfs" on storage.objects;
create policy "Public read pdfs"
  on storage.objects for select
  using (bucket_id in ('pdfs', 'uploads'));

drop policy if exists "Public upload pdfs" on storage.objects;
create policy "Public upload pdfs"
  on storage.objects for insert
  with check (bucket_id in ('pdfs', 'uploads'));

drop policy if exists "Public update pdfs" on storage.objects;
create policy "Public update pdfs"
  on storage.objects for update
  using (bucket_id in ('pdfs', 'uploads'))
  with check (bucket_id in ('pdfs', 'uploads'));

drop policy if exists "Public delete pdfs" on storage.objects;
create policy "Public delete pdfs"
  on storage.objects for delete
  using (bucket_id in ('pdfs', 'uploads'));

-- Legacy policies for older materials bucket (safe if unused)
drop policy if exists "Public read materials" on storage.objects;
drop policy if exists "Public upload materials" on storage.objects;
drop policy if exists "Public update materials" on storage.objects;
drop policy if exists "Public delete materials" on storage.objects;


-- ---------------------------------------------------------------------------
-- video_playlists: manual unit_name + material_type (Arabic)
-- ---------------------------------------------------------------------------
alter table public.video_playlists add column if not exists unit_name text;
alter table public.video_playlists add column if not exists material_type text;

-- Seed academic stages/grades if empty (idempotent via app seed; SQL helper)
-- Prefer running admin once so ensureDefaultAcademicStructure populates rows.

-- Unify educational_materials file column on file_path
alter table public.educational_materials add column if not exists file_path text;
alter table public.educational_materials add column if not exists pdf_url text;
alter table public.educational_materials alter column pdf_url drop not null;

-- Backfill file_path from legacy pdf_url when empty
update public.educational_materials
set file_path = pdf_url
where (file_path is null or file_path = '')
  and pdf_url is not null
  and pdf_url <> '';

-- Canonical file column for educational_materials
alter table public.educational_materials add column if not exists file_url text;

-- Backfill file_url from legacy columns
update public.educational_materials
set file_url = coalesce(nullif(file_url, ''), nullif(file_path, ''), nullif(pdf_url, ''))
where file_url is null or file_url = '';

alter table public.video_playlists add column if not exists playlist_url text;
update public.video_playlists
set playlist_url = coalesce(nullif(playlist_url, ''), nullif(youtube_url, ''))
where playlist_url is null or playlist_url = '';

-- Optional playlist cover image (public Storage URL or external URL)
alter table public.video_playlists add column if not exists cover_image_url text;