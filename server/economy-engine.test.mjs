import test from "node:test";
import assert from "node:assert/strict";
import { createWorld, registerPlayer, trade, advanceWorld, getWorldSnapshot } from "./economy-engine.mjs";

test("buy and sell transactions balance player credits, inventory and treasury", () => {
  const world = createWorld();
  const player = registerPlayer(world, { id: "p1", credits: 1000 });
  const before = player.credits;
  const buy = trade(world, { playerId: "p1", good: "food", side: "buy", quantity: 5 });
  assert.equal(buy.total, 60);
  assert.equal(player.credits, before - 60);
  assert.equal(player.inventory.food, 5);
  assert.equal(world.treasury, 60);
  const sell = trade(world, { playerId: "p1", good: "food", side: "sell", quantity: 2 });
  assert.equal(sell.total, 24);
  assert.equal(player.inventory.food, 3);
  assert.equal(player.credits, before - 36);
  assert.equal(world.treasury, 36);
});

test("invalid or unaffordable trades fail without mutating state", () => {
  const world = createWorld();
  registerPlayer(world, { id: "p2", credits: 1 });
  const before = structuredClone(world);
  assert.throws(() => trade(world, { playerId: "p2", good: "food", side: "buy", quantity: 1 }), /INSUFFICIENT_CREDITS/);
  assert.deepEqual(world, before);
  assert.throws(() => trade(world, { playerId: "p2", good: "unknown", side: "buy", quantity: 1 }), /INVALID_TRADE/);
  assert.throws(() => trade(world, { playerId: "p2", good: "food", side: "sell", quantity: 1 }), /INSUFFICIENT_INVENTORY/);
});

test("stale price protection and supply limits work", () => {
  const world = createWorld();
  registerPlayer(world, { id: "p3", credits: 10000 });
  assert.throws(() => trade(world, { playerId: "p3", good: "food", side: "buy", quantity: 1, expectedPrice: 999 }), /PRICE_CHANGED/);
  world.market.food.supply = 0;
  assert.throws(() => trade(world, { playerId: "p3", good: "food", side: "buy", quantity: 1 }), /INSUFFICIENT_SUPPLY/);
});

test("ticks are deterministic for equal seeds and prices stay finite and positive", () => {
  const a = createWorld({ seed: 123 });
  const b = createWorld({ seed: 123 });
  registerPlayer(a, { id: "p" }); registerPlayer(b, { id: "p" });
  for (let i = 0; i < 20; i++) { advanceWorld(a); advanceWorld(b); }
  assert.deepEqual(a.market, b.market);
  assert.equal(a.tick, 20);
  for (const item of Object.values(a.market)) assert.ok(Number.isFinite(item.price) && item.price >= 1);
});

test("snapshot only exposes requested player's own profile", () => {
  const world = createWorld();
  registerPlayer(world, { id: "p1" }); registerPlayer(world, { id: "p2" });
  assert.equal(getWorldSnapshot(world, "p1").player.id, "p1");
  assert.equal(getWorldSnapshot(world, "missing").player, null);
});
