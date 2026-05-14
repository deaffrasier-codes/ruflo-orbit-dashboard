-- Ruflo Orbit Dashboard — Supabase Schema
-- Run this in Supabase → SQL Editor

create type pipeline_stage as enum (
  'idea', 'concept', 'structure', 'scripts', 'audio', 'animation', 'marketing', 'published'
);

create type platform_type as enum (
  'youtube', 'tiktok', 'instagram', 'facebook', 'spotify'
);

create type saga_type as enum (
  'saga1_teletubbies', 'saga2_simpsons', 'saga3_shrek', 'saga4_animals', 'standalone'
);

create type content_type as enum ('parody', 'original', 'meme-remix');

create table songs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status pipeline_stage not null default 'idea',
  saga saga_type,
  platforms platform_type[] default '{}',
  -- Idea/Concept
  premise text,
  character text,
  tone text,
  content_type content_type,
  -- Structure
  genre text,
  bpm integer,
  musical_key text,
  chord_plan text,
  -- Scripts
  raw_lyrics text,
  -- Production
  shipped_date date,
  youtube_video_id text,
  tiktok_video_id text,
  instagram_media_id text,
  spotify_track_id text,
  google_drive_folder_url text,
  -- Analytics cache (updated by cron)
  views_youtube integer default 0,
  views_tiktok integer default 0,
  views_instagram integer default 0,
  streams_spotify integer default 0,
  -- Meta
  notes text,
  viral_alert boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references songs(id) on delete cascade,
  platform platform_type not null,
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  snapshot_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger songs_updated_at
  before update on songs
  for each row execute function update_updated_at();

-- Seed data: current active songs
insert into songs (name, status, saga, genre, bpm, musical_key, shipped_date, youtube_video_id, content_type) values
  ('Laa-Laa Quit Her Job', 'published', 'saga1_teletubbies', 'Synth-pop', 118, 'A major', '2026-05-12', null, 'parody'),
  ('Po Started a Podcast', 'animation', 'saga1_teletubbies', 'Lo-fi hip-hop / vaporwave', 88, 'D minor', null, null, 'parody'),
  ('Dipsy''s Therapist', 'animation', 'saga1_teletubbies', 'Smooth jazz / lounge', 95, 'G major', null, null, 'parody'),
  ('Marge''s Hair Is Self-Aware', 'published', 'saga2_simpsons', 'Musical theatre ballad', 76, 'D major', '2026-05-13', null, 'parody'),
  ('Shrek Swiped Right on Donkey', 'published', 'saga3_shrek', 'Acoustic indie-folk', 92, 'E minor', '2026-05-11', null, 'parody'),
  ('Possum Plays Dead Job Interview', 'structure', 'saga4_animals', 'Bossa nova / lounge', 100, 'F major', null, null, 'parody'),
  ('A Pigeon Complains About Gentrification', 'idea', 'saga4_animals', 'Lo-fi hip-hop / boom-bap', 85, 'D minor', null, null, 'parody'),
  ('Big Block', 'audio', 'standalone', 'K-Pop', 140, 'A major', null, null, 'original'),
  ('Bacon Day', 'scripts', 'standalone', 'Brain rot pop / nursery', 124, 'G major', null, null, 'parody'),
  ('Swiper Yes Swiping', 'scripts', 'standalone', 'Sad indie folk / heist', 124, 'A minor', null, null, 'parody');
