import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_CHAT_TOOLS, callAgentChatTool, executeAgentToolCalls } from "./agent-chat.mjs";

const owner = { id: 123456 };
const requireAiOwner = user => {
  if (String(user.id) !== String(owner.id)) throw new Error("AI_ACCESS_DENIED");
};

test("chat exposes strict start and status tools", () => {
  assert.deepEqual(AGENT_CHAT_TOOLS.map(tool => tool.name), ["start_agent_workflow", "get_agent_work_status"]);
  assert.ok(AGENT_CHAT_TOOLS.every(tool => tool.strict && tool.parameters.additionalProperties === false));
});

test("starting a workflow uses the authenticated owner id and confirms the queued id", async () => {
  const calls = [];
  const result = await callAgentChatTool("start_agent_workflow", { prompt: "  Проведи аудит проекта  " }, owner, {
    requireAiOwner,
    agentCloudRequest: async (route, options) => {
      calls.push({ route, options });
      return { task: { id: "task-123", status: "queued" } };
    }
  });
  assert.equal(result.kind, "task_queued");
  assert.equal(result.taskId, "task-123");
  assert.equal(calls[0].route, "/internal/tasks");
  assert.deepEqual(JSON.parse(calls[0].options.body), { userId: String(owner.id), prompt: "Проведи аудит проекта" });
});

test("invalid prompts do not create agent work and unauthorized users are rejected", async () => {
  let called = false;
  const deps = { requireAiOwner, agentCloudRequest: async () => { called = true; return {}; } };
  const invalid = await callAgentChatTool("start_agent_workflow", { prompt: "   " }, owner, deps);
  assert.equal(invalid.error, "INVALID_TASK");
  assert.equal(called, false);
  const secret = await callAgentChatTool("start_agent_workflow", { prompt: "Проверь OPENAI_API_KEY=abcdefghijk12345" }, owner, deps);
  assert.equal(secret.error, "SECRET_LIKE_TEXT_REJECTED");
  assert.equal(called, false);
  await assert.rejects(callAgentChatTool("start_agent_workflow", { prompt: "audit" }, { id: 9 }, deps), /AI_ACCESS_DENIED/);
});

test("status tool returns bounded task data from owner-scoped cloud routes", async () => {
  const routes = [];
  const task = {
    id: "task-1", status: "running", stage: "tester", prompt: "Проверить проект", updatedAt: "2026-11-19T12:00:00Z",
    result: { summary: "Summary with token=abcdef1234567890" }, events: Array.from({ length: 7 }, (_, i) => ({ agent: "tester", status: "running", content: "secret=abcdef1234567890 " + "x".repeat(400), createdAt: String(i) }))
  };
  const result = await callAgentChatTool("get_agent_work_status", {}, owner, {
    requireAiOwner,
    agentCloudRequest: async route => {
      routes.push(route);
      return route === "/internal/status"
        ? { storageConfigured: true, modelConfigured: true, roles: [{ key: "tester" }], writesEnabled: false }
        : { tasks: [task] };
    }
  });
  assert.equal(result.configured, true);
  assert.equal(result.tasks[0].recentEvents.length, 5);
  assert.equal(result.tasks[0].recentEvents[0].content.length, 300);
  assert.ok(!result.tasks[0].recentEvents[0].content.includes("abcdef1234567890"));
  assert.ok(!result.tasks[0].summary.includes("abcdef1234567890"));
  assert.ok(routes.includes(`/internal/tasks?userId=${owner.id}`));
});

test("tool call results are returned to AI and only a successful queued task is announced", async () => {
  const messages = [{ role: "user", content: "Проанализируй проект" }];
  const payload = { output: [{ type: "function_call", name: "start_agent_workflow", call_id: "call-1", arguments: JSON.stringify({ prompt: "Аудит проекта" }) }] };
  let followUpInput;
  const execution = await executeAgentToolCalls({
    payload,
    messages,
    user: owner,
    requireAiOwner,
    agentCloudRequest: async () => ({ task: { id: "wf-1", status: "queued" } }),
    requestResponses: async (input, allowTools) => { followUpInput = input; assert.equal(allowTools, false); return { output_text: "Задача поставлена." }; }
  });
  assert.equal(execution.agentActions[0].taskId, "wf-1");
  assert.equal(execution.payload.output_text, "Задача поставлена.");
  assert.equal(followUpInput.at(-1).type, "function_call_output");
  assert.equal(JSON.parse(followUpInput.at(-1).output).taskId, "wf-1");
});

test("multiple model tool calls fail closed instead of launching duplicate workflows", async () => {
  let launchCount = 0;
  let returned;
  const payload = { output: [
    { type: "function_call", name: "start_agent_workflow", call_id: "1", arguments: '{"prompt":"first"}' },
    { type: "function_call", name: "start_agent_workflow", call_id: "2", arguments: '{"prompt":"second"}' }
  ] };
  const execution = await executeAgentToolCalls({
    payload,
    messages: [],
    user: owner,
    requireAiOwner,
    agentCloudRequest: async () => { launchCount += 1; return { task: { id: "duplicate" } }; },
    requestResponses: async input => { returned = input; return { output_text: "Одна задача за раз." }; }
  });
  assert.equal(launchCount, 0);
  assert.equal(execution.agentActions.length, 0);
  assert.equal(returned.filter(item => item.type === "function_call_output").length, 2);
});
