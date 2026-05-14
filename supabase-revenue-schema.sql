-- Revenue tracking tables
-- Run in Supabase SQL Editor

-- DistroKid earnings (imported via CSV)
create table if not exists distrokid_earnings (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references songs(id) on delete set null,
  reporting_date date not null,
  store text not null,
  country text,
  quantity integer default 0,
  earnings_usd numeric(10,4) not null default 0,
  song_title text,
  isrc text,
  upc text,
  created_at timestamptz default now(),
  unique(isrc, store, country, reporting_date)
);
alter table distrokid_earnings disable row level security;

-- YouTube Analytics (synced via cron, requires OAuth)
create table if not exists youtube_analytics (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references songs(id) on delete set null,
  video_id text not null,
  date date not null,
  estimated_revenue numeric(10,4) default 0,
  estimated_ad_revenue numeric(10,4) default 0,
  views integer default 0,
  watch_time_minutes numeric(12,2) default 0,
  created_at timestamptz default now(),
  unique(video_id, date)
);
alter table youtube_analytics disable row level security;

-- Meta ad campaigns (linked to songs by name pattern)
create table if not exists meta_campaigns (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references songs(id) on delete set null,
  campaign_id text unique not null,
  campaign_name text not null,
  created_at timestamptz default now()
);
alter table meta_campaigns disable row level security;

-- Meta daily spend snapshots
create table if not exists meta_insights (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references meta_campaigns(campaign_id) on delete cascade,
  date date not null,
  spend numeric(10,4) default 0,
  impressions integer default 0,
  reach integer default 0,
  clicks integer default 0,
  created_at timestamptz default now(),
  unique(campaign_id, date)
);
alter table meta_insights disable row level security;

-- Add ISRC/UPC to songs if not present
alter table songs add column if not exists isrc text;
alter table songs add column if not exists upc text;
