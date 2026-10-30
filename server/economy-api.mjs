import pg from "pg";
import { createWorld, registerPlayer, trade, advanceWorld, getWorldSnapshot } from "./economy-engine.mjs";

const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
  max: 8,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
}) : null;
let schemaReady;

async function ensureSchema() {
  if (!pool) throw new Error("ECONOMY_DATABASE_NOT_CONFIGURED");
  if (!schemaReady) schemaReady = pool.query(`
    CREATE TABLE IF NOT EXISTS economy_worlds (
      id text PRIMARY KEY, tick bigint NOT NULL DEFAULT 0 CHECK (tick >= 0),
      seed bigint NOT NULL, treasury bigint NOT NULL DEFAULT 0,
      state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS economy_players (
      world_id text NOT NULL REFERENCES economy_worlds(id) ON DELETE CASCADE,
      telegram_user_id text NOT NULL, display_name text NOT NULL DEFAULT 'Founder',
      credits bigint NOT NULL DEFAULT 1000 CHECK (credits >= 0),
      inventory jsonb NOT NULL DEFAULT '{"food":0,"energy":0,"materials":0,"equipment":0}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (world_id, telegram_user_id)
    );
    CREATE TABLE IF NOT EXISTS economy_transactions (
      id bigserial PRIMARY KEY, world_id text NOT NULL REFERENCES economy_worlds(id) ON DELETE CASCADE,
      telegram_user_id text NOT NULL, tick bigint NOT NULL,
      side text NOT NULL CHECK (side IN ('buy','sell','tick','tax')),
      good text, quantity integer, unit_price bigint, total bigint,
      details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS economy_transactions_world_tick_idx ON economy_transactions(world_id, tick DESC, id DESC);
    CREATE INDEX IF NOT EXISTS economy_transactions_player_idx ON economy_transactions(world_id, telegram_user_id, id DESC);
  `).catch(error => { schemaReady = null; throw error; });
  await schemaReady;
}

async function withWorld(worldId, playerId, callback) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const seed = Number.parseInt(process.env.ECONOMY_WORLD_SEED || "9137", 10);
    const initial = createWorld({ id: worldId, seed: Number.isSafeInteger(seed) && seed >= 0 ? seed : 9137 });
    await client.query(
      "INSERT INTO economy_worlds (id,tick,seed,treasury,state) VALUES ($1,0,$2,0,$3::jsonb) ON CONFLICT (id) DO NOTHING",
      [worldId, initial.seed, JSON.stringify(initial)]
    );
    const selected = await client.query("SELECT state FROM economy_worlds WHERE id=$1 FOR UPDATE", [worldId]);
    const world = selected.rows[0].state;
    const playerRow = await client.query(
      "SELECT telegram_user_id,display_name,credits,inventory FROM economy_players WHERE world_id=$1",
      [worldId]
    );
    for (const row of playerRow.rows) {
      const player = registerPlayer(world, { id: row.telegram_user_id, name: row.display_name, credits: Number(row.credits) });
      player.inventory = { ...player.inventory, ...row.inventory };
    }
    const existing = await client.query("SELECT telegram_user_id FROM economy_players WHERE world_id=$1 AND telegram_user_id=$2", [worldId, playerId]);
    if (!existing.rowCount) {
      const player = registerPlayer(world, { id: playerId, name: "Player " + playerId.slice(-4), credits: 1000 });
      await client.query(
        "INSERT INTO economy_players(world_id,telegram_user_id,display_name,credits,inventory) VALUES($1,$2,$3,$4,$5::jsonb)",
        [worldId, playerId, player.name, player.credits, JSON.stringify(player.inventory)]
      );
    }
    const ledgerStart = world.ledger.length;
    const result = await callback(world, client);
    for (const entry of world.ledger.slice(ledgerStart)) {
      await client.query(
        "INSERT INTO economy_transactions(world_id,telegram_user_id,tick,side,good,quantity,unit_price,total,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)",
        [worldId, String(entry.playerId || playerId), entry.tick, ["buy","sell","tick","tax"].includes(entry.type) ? entry.type : "tick", entry.good || null, entry.quantity || null, entry.unitPrice || null, entry.total || null, JSON.stringify(entry)]
      );
    }
    const player = world.players[playerId];
    await client.query(
      "UPDATE economy_players SET credits=$3,inventory=$4::jsonb,updated_at=now() WHERE world_id=$1 AND telegram_user_id=$2",
      [worldId, playerId, player.credits, JSON.stringify(player.inventory)]
    );
    await client.query(
      "UPDATE economy_worlds SET tick=$2,seed=$3,treasury=$4,state=$5::jsonb,updated_at=now() WHERE id=$1",
      [worldId, world.tick, world.seed, world.treasury, JSON.stringify(world)]
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function handleEconomyRoute(req, url, playerId, sendJson, origin) {
  if (!url.pathname.startsWith("/api/economy/")) return null;
  if (!pool) return sendJson(null, 503, { ok: false, error: "ECONOMY_DATABASE_NOT_CONFIGURED" }, origin);
  if (!["GET", "POST"].includes(req.method)) return sendJson(null, 405, { ok: false, error: "METHOD_NOT_ALLOWED" }, origin);
  const worldId = (url.searchParams.get("world") || "prime").slice(0, 40);
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(worldId)) return sendJson(null, 400, { ok: false, error: "INVALID_WORLD_ID" }, origin);
  try {
    if (url.pathname === "/api/economy/world" && req.method === "GET") {
      const result = await withWorld(worldId, String(playerId), async world => getWorldSnapshot(world, String(playerId)));
      return sendJson(null, 200, { ok: true, ...result }, origin);
    }
    if (url.pathname === "/api/economy/trade" && req.method === "POST") {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 4096) throw new Error("PAYLOAD_TOO_LARGE");
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const result = await withWorld(worldId, String(playerId), async world => {
        const receipt = trade(world, {
          playerId: String(playerId), good: body.good, side: body.side,
          quantity: body.quantity, expectedPrice: body.expectedPrice
        });
        return { receipt, snapshot: getWorldSnapshot(world, String(playerId)) };
      });
      return sendJson(null, 200, { ok: true, ...result }, origin);
    }
    if (url.pathname === "/api/economy/tick" && req.method === "POST") {
      if (process.env.ECONOMY_ALLOW_PLAYER_TICKS !== "true") return sendJson(null, 403, { ok: false, error: "TICK_NOT_ALLOWED" }, origin);
      const result = await withWorld(worldId, String(playerId), async world => {
        const tick = advanceWorld(world);
        return { tick, snapshot: getWorldSnapshot(world, String(playerId)) };
      });
      return sendJson(null, 200, { ok: true, ...result }, origin);
    }
    return sendJson(null, 404, { ok: false, error: "NOT_FOUND" }, origin);
  } catch (error) {
    const code = error instanceof Error ? error.message : "ECONOMY_ERROR";
    const status = error instanceof SyntaxError ? 400 : code === "PAYLOAD_TOO_LARGE" ? 413 : ["INVALID_TRADE","INVALID_SIDE","INVALID_QUANTITY","TRADE_TOO_LARGE","PRICE_CHANGED","INSUFFICIENT_CREDITS","INSUFFICIENT_SUPPLY","INSUFFICIENT_INVENTORY","INVALID_WORLD_ID","INVALID_SEED"].includes(code) ? 400 : 500;
    console.error("economy api error", code);
    return sendJson(null, status, { ok: false, error: code }, origin);
  }
}


let economyTimer = null;
export function startEconomyScheduler() {
  if (!pool || economyTimer) return;
  const runTick = async () => {
    let lockClient;
    const lockKey = 742091337;
    try {
      // Render or other hosts may run multiple API instances. A session-level
      // advisory lock makes the world clock advance only once per scheduler tick.
      lockClient = await pool.connect();
      const lock = await lockClient.query("SELECT pg_try_advisory_lock($1) AS locked", [lockKey]);
      if (!lock.rows[0]?.locked) return;
      await ensureSchema();
      const worlds = await pool.query("SELECT id FROM economy_worlds ORDER BY id");
      for (const item of worlds.rows) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const selected = await client.query("SELECT state FROM economy_worlds WHERE id=$1 FOR UPDATE", [item.id]);
          if (!selected.rowCount) { await client.query("COMMIT"); continue; }
          const world = selected.rows[0].state;
          const players = await client.query(
            "SELECT telegram_user_id,display_name,credits,inventory FROM economy_players WHERE world_id=$1",
            [item.id]
          );
          for (const row of players.rows) {
            const player = registerPlayer(world, { id: row.telegram_user_id, name: row.display_name, credits: Number(row.credits) });
            player.inventory = { ...player.inventory, ...row.inventory };
          }
          const tickResult = advanceWorld(world);
          await client.query(
            "UPDATE economy_worlds SET tick=$2,seed=$3,treasury=$4,state=$5::jsonb,updated_at=now() WHERE id=$1",
            [item.id, world.tick, world.seed, world.treasury, JSON.stringify(world)]
          );
          await client.query(
            "INSERT INTO economy_transactions(world_id,telegram_user_id,tick,side,details) VALUES($1,'system',$2,'tick',$3::jsonb)",
            [item.id, world.tick, JSON.stringify(tickResult)]
          );
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          console.error("economy world tick failed", item.id, error?.message || error);
        } finally {
          client.release();
        }
      }
    } catch (error) {
      console.error("economy scheduler failed", error?.message || error);
    } finally {
      if (lockClient) {
        try { await lockClient.query("SELECT pg_advisory_unlock($1)", [lockKey]); }
        catch (error) { console.error("economy scheduler lock release failed", error?.message || error); }
        lockClient.release();
      }
    }
  };
  economyTimer = setInterval(runTick, 60_000);
  economyTimer.unref?.();
}
