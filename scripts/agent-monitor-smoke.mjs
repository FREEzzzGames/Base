import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync("src/freezzz-ai.ts", "utf8");
const styles = readFileSync("src/freezzz-ai.css", "utf8");
const backend = readFileSync("server/index.mjs", "utf8");
const agentChat = readFileSync("server/agent-chat.mjs", "utf8");

for (const selector of [
  "data-agent-toggle",
  "data-agent-status",
  "data-agent-kpis",
  "data-agent-roster",
  "data-agent-list",
  "data-agent-updated",
  "data-ai-form",
  "data-ai-input"
]) assert.ok(ui.includes(selector), `Agent monitor selector is missing: ${selector}`);

for (const selector of ["data-agent-form", "data-agent-prompt", "data-agent-submit", "data-dev-toggle", "data-context-toggle", "data-new-chat"])
  assert.ok(!ui.includes(selector), `Unrequested control should be removed from the chat UI: ${selector}`);
assert.ok(ui.includes("aria-expanded") && ui.includes("Пиши задачу в чат"), "Chat must be the default view with one agent-menu action.");
assert.ok(ui.includes('action.kind === "task_queued"') && ui.includes("data.agentActions"), "Chat must confirm tool-started agent tasks.");

for (const role of ["coordinator", "researcher", "developer", "tester", "auditor"])
  assert.ok(ui.includes(role), `Agent monitor role is missing: ${role}`);

assert.match(ui, /setInterval\(\(\) => \{[\s\S]*refreshAgentPanel\(false\)[\s\S]*\}, 5000\)/,
  "Open monitor should refresh cloud task state every five seconds.");
assert.match(ui, /agentConnected = false;[\s\S]*СВЯЗЬ ПОТЕРЯНА · ПОКАЗАНЫ ПОСЛЕДНИЕ ДАННЫЕ/,
  "A disconnected monitor must label cached data as stale.");
assert.ok(ui.includes('escapeAgentText(event.content.slice(0, 360))'), "Agent event text must be escaped before rendering.");
assert.ok(ui.includes('escapeAgentText(task.prompt)'), "User task text must be escaped before rendering.");
assert.ok(styles.includes(".ai-shell.agent-monitor-mode") && styles.includes("@media(max-width:720px)"),
  "Monitor must have full-screen desktop and responsive mobile layouts.");
assert.ok(backend.includes('pathName === "/api/agents/status"') && backend.includes("requireAiOwner(user)"),
  "Monitor must reuse the existing owner-authenticated Agent API.");
assert.ok(agentChat.includes('name: "start_agent_workflow"') && agentChat.includes('name: "get_agent_work_status"'),
  "The AI chat must be able to start agent work and query the live status on demand.");
assert.ok(agentChat.includes("requireAiOwner(user)"), "Agent workflow tools must enforce owner authorization.");
assert.ok(backend.includes("executeAgentToolCalls({") && backend.includes("requireAiOwner"), "Agent workflow actions must be routed through the authenticated backend chat.");
assert.ok(agentChat.includes("requestResponses([...messages, ...(payload.output || []), ...toolOutputs], false)"), "The chat must return tool results to the AI before showing its reply.");

console.log("AGENT_MONITOR_SMOKE_OK");
