-- FREEzzz MMO economy persistence schema (PostgreSQL)
-- Apply once to the Render PostgreSQL database before enabling DB-backed routes.
CREATE TABLE IF NOT EXISTS economy_worlds (
  id text PRIMARY KEY,
  tick bigint NOT NULL DEFAULT 0 CHECK (tick >= 0),
  seed bigint NOT NULL,
  treasury bigint NOT NULL DEFAULT 0,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS economy_players (
  world_id text NOT NULL REFERENCES economy_worlds(id) ON DELETE CASCADE,
  telegram_user_id text NOT NULL,
  display_name text NOT NULL DEFAULT 'Founder',
  credits bigint NOT NULL DEFAULT 1000 CHECK (credits >= 0),
  inventory jsonb NOT NULL DEFAULT '{"food":0,"energy":0,"materials":0,"equipment":0}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, telegram_user_id)
);

CREATE TABLE IF NOT EXISTS economy_transactions (
  id bigserial PRIMARY KEY,
  world_id text NOT NULL REFERENCES economy_worlds(id) ON DELETE CASCADE,
  telegram_user_id text NOT NULL,
  tick bigint NOT NULL,
  side text NOT NULL CHECK (side IN ('buy','sell','tick','tax')),
  good text,
  quantity integer,
  unit_price bigint,
  total bigint,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS economy_transactions_world_tick_idx
  ON economy_transactions(world_id, tick DESC, id DESC);
CREATE INDEX IF NOT EXISTS economy_transactions_player_idx
  ON economy_transactions(world_id, telegram_user_id, id DESC);
