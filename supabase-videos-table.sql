-- Add videos table for multi-video tracking per song
-- Run this in Supabase SQL Editor AFTER supabase-schema.sql

create table videos (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references songs(id) on delete cascade not null,
  platform platform_type not null,
  video_id text not null,
  video_type text not null check (video_type in ('longform', 'short', 'reel', 'tiktok', 'post')),
  title text,
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  published_at timestamptz,
  created_at timestamptz default now(),
  unique(platform, video_id)
);

alter table videos disable row level security;
