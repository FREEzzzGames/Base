import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyRankings } from "./live-rankings.mjs";

const creators = Array.from({ length: 6 }, (_, index) => ({
  id: "creator-" + index,
  name: "Creator " + index,
  region: "US",
  language: "en",
  category: "gaming",
  subcategory: "MOBA",
  platforms: {
    youtube: { url: "https://www.youtube.com/@creator" + index },
    twitch: { url: "https://www.twitch.tv/creator" + index, login: "creator" + index }
  }
}));

function snapshot(creator, platform, day, metrics) {
  return {
    creatorId: creator.id,
    platform,
    observedAt: "2026-09-" + String(day).padStart(2, "0") + "T12:00:00.000Z",
    metrics
  };
}

const snapshots = creators.flatMap((creator, index) => [
  snapshot(creator, "youtube", 1, { subscribers: 1000, views: 10000 }),
  snapshot(creator, "youtube", 29, { subscribers: 1000 + (index + 1) * 100, views: 10000 + (index + 1) * 1000 }),
  snapshot(creator, "twitch", 5, { live: true, viewers: (index + 1) * 10 }),
  snapshot(creator, "twitch", 15, { live: true, viewers: (index + 1) * 10 }),
  snapshot(creator, "twitch", 25, { live: true, viewers: (index + 1) * 10 })
]);

test("monthly rankings use the selected completed month and retain only top five per group", () => {
  const result = buildMonthlyRankings({ creators, snapshots }, "2026-09");
  assert.equal(result.length, 10);
  assert.deepEqual(result.filter(x => x.platform === "youtube").map(x => x.rank), [1, 2, 3, 4, 5]);
  assert.deepEqual(result.filter(x => x.platform === "twitch").map(x => x.rank), [1, 2, 3, 4, 5]);
  assert.equal(result.find(x => x.platform === "youtube" && x.rank === 1).name, "Creator 5");
  assert.equal(result.find(x => x.platform === "twitch" && x.rank === 1).name, "Creator 5");
  assert.ok(result.every(x => x.month === "2026-09" && x.region === "US"));
});

test("monthly rankings exclude unknown regions and incomplete observation windows", () => {
  const limited = {
    creators: [
      { ...creators[0], region: undefined },
      creators[1]
    ],
    snapshots: [
      snapshot(creators[1], "youtube", 2, { subscribers: 100, views: 200 }),
      snapshot(creators[1], "youtube", 8, { subscribers: 150, views: 300 })
    ]
  };
  assert.deepEqual(buildMonthlyRankings(limited, "2026-09"), []);
});

test("monthly rankings reject malformed month values", () => {
  assert.throws(() => buildMonthlyRankings({ creators: [], snapshots: [] }, "2026-13"), /INVALID_TARGET_MONTH/);
});
