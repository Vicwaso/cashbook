-- Run this in your Supabase project's SQL editor (Database > SQL Editor > New query)

create table if not exists entries (
  id text primary key,
  amount numeric not null,
  venture text not null,
  date date not null,
  time text,
  note text,
  created_at timestamptz default now()
);

-- Row Level Security: this app has no real login, so access is controlled
-- only by (a) your app's password screen and (b) keeping the anon key out
-- of public view. See the "Privacy note" in README.md before relying on this.
alter table entries enable row level security;

create policy "allow anon all access"
  on entries
  for all
  to anon
  using (true)
  with check (true);
