/*
# Create game_rooms table for online multiplayer lobbies

1. New Tables
- `game_rooms`
  - `id` (uuid, primary key)
  - `code` (text, 6-character room code, unique) — the shareable join code
  - `host_user_id` (text) — the TTH user ID of the room creator
  - `host_name` (text) — display name of host
  - `status` (text, default 'waiting') — waiting | playing | closed
  - `players` (jsonb, default []) — array of {userId, name, color, ready}
  - `max_players` (int, default 4)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on `game_rooms`.
- This is a no-auth app (localStorage login only), so allow anon + authenticated
  full CRUD so the anon-key frontend can create, join, update, and delete rooms.
- USING (true) is acceptable here because rooms are intentionally public/shared
  matchmaking data — anyone with a code can join.

3. Notes
- No foreign keys to auth.users since this app uses localStorage-only profiles.
- The `players` jsonb array holds the seat list; updates replace the whole array.
*/

CREATE TABLE IF NOT EXISTS game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_user_id text NOT NULL,
  host_name text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_players int NOT NULL DEFAULT 4,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rooms" ON game_rooms;
CREATE POLICY "anon_select_rooms" ON game_rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rooms" ON game_rooms;
CREATE POLICY "anon_insert_rooms" ON game_rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rooms" ON game_rooms;
CREATE POLICY "anon_update_rooms" ON game_rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rooms" ON game_rooms;
CREATE POLICY "anon_delete_rooms" ON game_rooms FOR DELETE
  TO anon, authenticated USING (true);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms (code);
