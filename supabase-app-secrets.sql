-- Run in Supabase SQL Editor
create table if not exists app_secrets (
  key text primary key,
  value text not null,
  expires_at timestamptz
);

alter table app_secrets disable row level security;
