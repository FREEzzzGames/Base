import test from "node:test";
import assert from "node:assert/strict";
import { createAgentSystem } from "./agent-system.mjs";

test("agent system is cloud-only and reports missing cloud configuration", () => {
  const system = createAgentSystem({ env: {} });
  const status = system.status();
  assert.equal(status.mode, "cloud-only");
  assert.equal(status.databaseConfigured, false);
  assert.equal(status.modelConfigured, false);
  assert.equal(status.writesEnabled, false);
  assert.deepEqual(status.roles.map(role => role.key), [
    "coordinator", "researcher", "developer", "tester", "auditor"
  ]);
});

test("agent system accepts explicit Cloudflare model configuration without local runtime", () => {
  const system = createAgentSystem({
    env: {
      CLOUDFLARE_ACCOUNT_ID: "account-test",
      CLOUDFLARE_API_TOKEN: "token-test",
      CLOUDFLARE_AI_MODEL: "@cf/zai-org/glm-4.7-flash"
    }
  });
  const status = system.status();
  assert.equal(status.modelConfigured, true);
  assert.equal(status.model, "@cf/zai-org/glm-4.7-flash");
  assert.equal(status.mode, "cloud-only");
});
