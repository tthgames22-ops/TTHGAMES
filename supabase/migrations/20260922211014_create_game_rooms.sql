/*
# Create game_rooms table for online Ludo multiplayer

1. New Tables
- `game_rooms`
  - `id` (uuid, primary key)
  - `code` (text, unique, 6-char room code for joining)
  - `host_id` (uuid, the host player's auth id)
  - `state` (jsonb, full game state: players, board positions, turn, dice, etc.)
  - `status` (text: 'waiting' | 'playing' | 'finished')
  - `max_players` (int, default 4)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz, auto-updated)

2. Security
- Enable RLS on `game_rooms`.
- All authenticated users can read rooms (to find/join games).
- All authenticated users can insert rooms (to create games).
- All authenticated users can update rooms (to make moves).
- All authenticated users can delete rooms (host cleanup).
- This is shared game data — all players need access to the same room row.
*/

CREATE TABLE IF NOT EXISTS game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_id uuid NOT NULL DEFAULT auth.uid(),
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'waiting',
  max_players int NOT NULL DEFAULT 4,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_game_rooms" ON game_rooms;
CREATE POLICY "select_game_rooms" ON game_rooms FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_game_rooms" ON game_rooms;
CREATE POLICY "insert_game_rooms" ON game_rooms FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_game_rooms" ON game_rooms;
CREATE POLICY "update_game_rooms" ON game_rooms FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_game_rooms" ON game_rooms;
CREATE POLICY "delete_game_rooms" ON game_rooms FOR DELETE
  TO authenticated USING (true);
