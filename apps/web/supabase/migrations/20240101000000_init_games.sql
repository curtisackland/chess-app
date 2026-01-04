-- Create games table
create table public.games (
  id uuid primary key default gen_random_uuid(),
  player_white text,
  player_black text,
  pgn text not null default '',
  status text not null default 'waiting', -- waiting, active, complete
  result text, -- white_wins, black_wins, draw
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table public.games;

-- RLS Policies
alter table public.games enable row level security;

-- Allow anyone to create a game (for MVP)
create policy "Anyone can create a game"
on public.games for insert
to anon
with check (true);

-- Allow anyone to view games (for MVP simplifiction, otherwise restrict by player)
create policy "Anyone can view games"
on public.games for select
to anon
using (true);

-- Allow players to update their game (e.g. make move)
-- Ideally this shouldn't be open to generic updates, but for MVP we trust the client logic or valid move actions
-- A better approach is to use a Postgres function for moves, but we'll allow updates for now.
create policy "Anyone can update games"
on public.games for update
to anon
using (true);
