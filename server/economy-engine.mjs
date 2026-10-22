/**
 * Deterministic, server-authoritative economic primitives for FREEzzz MMO.
 * Money is stored as integer credits to avoid floating-point transaction drift.
 */
export const GOODS = Object.freeze({
  food: { label: "Food", basePrice: 12, volatility: 0.08 },
  energy: { label: "Energy", basePrice: 18, volatility: 0.12 },
  materials: { label: "Materials", basePrice: 25, volatility: 0.1 },
  equipment: { label: "Equipment", basePrice: 60, volatility: 0.15 }
});

export function createWorld({ id = "prime", seed = 9137, startingCredits = 1000 } = {}) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new Error("INVALID_SEED");
  if (!Number.isSafeInteger(startingCredits) || startingCredits < 0) throw new Error("INVALID_STARTING_CREDITS");
  return {
    id, tick: 0, seed: seed >>> 0, treasury: 1_000_000,
    players: {},
    market: Object.fromEntries(Object.entries(GOODS).map(([good, spec]) => [good, {
      price: spec.basePrice, supply: 100, demand: 100, volume: 0
    }])),
    ledger: []
  };
}

export function registerPlayer(world, { id, name = "Founder", credits = 1000 } = {}) {
  if (!world || typeof world !== "object") throw new Error("INVALID_WORLD");
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error("INVALID_PLAYER_ID");
  if (world.players[id]) return world.players[id];
  if (!Number.isSafeInteger(credits) || credits < 0) throw new Error("INVALID_CREDITS");
  const player = { id, name: String(name).slice(0, 60) || "Founder", credits, inventory: {}, companies: [] };
  for (const good of Object.keys(GOODS)) player.inventory[good] = 0;
  world.players[id] = player;
  return player;
}

function ledger(world, entry) {
  world.ledger.push({ id: world.ledger.length + 1, tick: world.tick, ...entry });
  if (world.ledger.length > 500) world.ledger.splice(0, world.ledger.length - 500);
}

export function trade(world, { playerId, good, side, quantity, expectedPrice } = {}) {
  const player = world?.players?.[playerId];
  const market = world?.market?.[good];
  if (!player || !market || !GOODS[good]) throw new Error("INVALID_TRADE");
  if (side !== "buy" && side !== "sell") throw new Error("INVALID_SIDE");
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error("INVALID_QUANTITY");
  const unitPrice = market.price;
  if (expectedPrice !== undefined && (!Number.isSafeInteger(expectedPrice) || expectedPrice !== unitPrice)) {
    throw new Error("PRICE_CHANGED");
  }
  const total = unitPrice * quantity;
  if (!Number.isSafeInteger(total)) throw new Error("TRADE_TOO_LARGE");
  if (side === "buy") {
    if (player.credits < total) throw new Error("INSUFFICIENT_CREDITS");
    if (market.supply < quantity) throw new Error("INSUFFICIENT_SUPPLY");
    player.credits -= total;
    player.inventory[good] += quantity;
    market.supply -= quantity;
    market.demand += quantity;
    world.treasury += total;
  } else {
    if (player.inventory[good] < quantity) throw new Error("INSUFFICIENT_INVENTORY");
    player.inventory[good] -= quantity;
    player.credits += total;
    market.supply += quantity;
    market.demand = Math.max(0, market.demand - quantity);
    world.treasury -= total;
  }
  market.volume += quantity;
  ledger(world, { playerId, type: side, good, quantity, unitPrice, total });
  return { playerId, good, side, quantity, unitPrice, total, credits: player.credits, inventory: player.inventory[good] };
}

// Seeded PRNG makes simulation reproducible and testable across server instances.
function random(world) {
  let x = world.seed >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  world.seed = x >>> 0;
  return world.seed / 0x100000000;
}

export function advanceWorld(world, { taxRate = 0.05, interestRate = 0.01 } = {}) {
  if (!world || !world.market || !world.players) throw new Error("INVALID_WORLD");
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 0.5) throw new Error("INVALID_TAX_RATE");
  if (!Number.isFinite(interestRate) || interestRate < 0 || interestRate > 0.5) throw new Error("INVALID_INTEREST_RATE");
  world.tick += 1;
  const changes = [];
  for (const [good, spec] of Object.entries(GOODS)) {
    const market = world.market[good];
    const noise = (random(world) - 0.5) * spec.volatility;
    const imbalance = (market.demand - market.supply) / Math.max(50, market.demand + market.supply);
    const multiplier = Math.min(1.25, Math.max(0.75, 1 + imbalance * 0.4 + noise));
    market.price = Math.max(1, Math.round(market.price * multiplier));
    market.demand = Math.max(10, Math.round(market.demand * 0.9 + 10));
    market.supply = Math.max(10, Math.round(market.supply * 0.9 + 10));
    market.volume = 0;
    changes.push({ good, price: market.price });
  }
  for (const player of Object.values(world.players)) {
    // Idle cash receives no interest; this parameter is reserved for player debt
    // once the debt model is introduced, rather than silently minting credits.
    if (!Number.isFinite(player.credits) || player.credits < 0) throw new Error("WORLD_INVARIANT_FAILED");
  }
  ledger(world, { type: "tick", changes, taxRate, interestRate });
  return { tick: world.tick, changes };
}

export function getWorldSnapshot(world, playerId) {
  const player = world.players[playerId];
  return {
    id: world.id,
    tick: world.tick,
    treasury: world.treasury,
    market: structuredClone(world.market),
    player: player ? structuredClone(player) : null,
    recentLedger: world.ledger.slice(-25).reverse()
  };
}
