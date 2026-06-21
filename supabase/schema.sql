-- AutoBlog — Supabase schema (the bridge between the Python generator and the Next.js sites).
-- Run this in the Supabase SQL editor, then set STORAGE_BACKEND=supabase + SUPABASE_* in generator/.env.

create table if not exists articles (
  id                 text primary key,
  site_id            text not null,
  title              text not null,
  slug               text not null,
  meta_title         text,
  meta_description   text,
  excerpt            text,
  body_html          text,
  tags               jsonb default '[]'::jsonb,
  faq                jsonb default '[]'::jsonb,
  keyword            text,
  secondary_keywords jsonb default '[]'::jsonb,
  image_url          text,
  schema             jsonb,
  word_count         int,
  reading_time       int,
  status             text default 'published',
  is_mock            boolean default false,
  created_at         timestamptz default now(),
  unique (site_id, slug)
);

create index if not exists articles_site_idx on articles (site_id, created_at desc);

-- Row Level Security: the Next.js sites read published posts with the public anon key;
-- the Python generator writes with the service-role key (which bypasses RLS).
alter table articles enable row level security;

create policy "public can read published"
  on articles for select
  using (status = 'published');
