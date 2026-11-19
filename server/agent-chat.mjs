export const AGENT_CHAT_TOOLS = [
  {
    type: "function",
    name: "start_agent_workflow",
    description: "Запусти read-only команду FREEzzz из пяти агентов для конкретной многошаговой задачи по проекту, архитектуре, аудиту или плану изменений. Не вызывай для обычных вопросов и простых бесед. Запуск только анализирует и готовит предложения; файлы не меняются.",
    parameters: {
      type: "object",
      properties: { prompt: { type: "string", description: "Минимально достаточное описание задачи для облачной команды агентов, без секретов и личных данных.", maxLength: 6000 } },
      required: ["prompt"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "get_agent_work_status",
    description: "Получи актуальное состояние пяти агентов и последние задачи владельца, когда пользователь спрашивает, что делают агенты или просит показать ход работы.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true
  }
];

const CREDENTIAL_PATTERN = /(?:\b(?:sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,})\b|\bBearer\s+[a-z0-9._~+/=-]{12,}|(?:[a-z0-9]+[_-])?(?:api[_-]?key|access[_-]?token|auth[_-]?token|token|password|passwd|secret|credential)\s*[:=]\s*[^\s,;]{6,})/i;

function redactAgentText(value, maxLength) {
  return String(value || "")
    .replace(/\b(?:sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,})\b/gi, "[СЕКРЕТ СКРЫТ]")
    .replace(/\bBearer\s+[a-z0-9._~+/=-]{12,}/gi, "Bearer [СЕКРЕТ СКРЫТ]")
    .replace(/((?:[a-z0-9]+[_-])?(?:api[_-]?key|access[_-]?token|auth[_-]?token|token|password|passwd|secret|credential)\s*[:=]\s*)[^\s,;]{6,}/gi, "$1[СЕКРЕТ СКРЫТ]")
    .slice(0, maxLength);
}

export async function callAgentChatTool(name, args, user, { agentCloudRequest, requireAiOwner }) {
  requireAiOwner(user);
  if (name === "start_agent_workflow") {
    const prompt = typeof args?.prompt === "string" ? args.prompt.trim() : "";
    if (!prompt || prompt.length > 6000) return { ok: false, error: "INVALID_TASK" };
    if (CREDENTIAL_PATTERN.test(prompt)) return { ok: false, error: "SECRET_LIKE_TEXT_REJECTED" };
    try {
      const result = await agentCloudRequest("/internal/tasks", {
        method: "POST", body: JSON.stringify({ userId: String(user.id), prompt })
      });
      return { ok: true, kind: "task_queued", taskId: result.task?.id || "", status: result.task?.status || "queued" };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "AGENT_CLOUD_UPSTREAM_ERROR" };
    }
  }
  if (name === "get_agent_work_status") {
    try {
      const [config, data] = await Promise.all([
        agentCloudRequest("/internal/status"),
        agentCloudRequest("/internal/tasks?userId=" + encodeURIComponent(String(user.id)))
      ]);
      const tasks = (data.tasks || []).slice(0, 8).map(task => ({
        id: task.id,
        status: task.status,
        stage: task.stage,
        prompt: redactAgentText(task.prompt, 500),
        updatedAt: task.updatedAt,
        summary: redactAgentText(task.result?.summary, 1000),
        error: task.error || undefined,
        recentEvents: (task.events || []).slice(-5).map(event => ({
          agent: event.agent,
          status: event.status,
          content: redactAgentText(event.content, 300),
          createdAt: event.createdAt
        }))
      }));
      return {
        ok: true,
        configured: Boolean(config.storageConfigured && config.modelConfigured),
        mode: config.mode || "cloud-only",
        writesEnabled: Boolean(config.writesEnabled),
        roles: config.roles || [],
        tasks
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "AGENT_CLOUD_UPSTREAM_ERROR" };
    }
  }
  return { ok: false, error: "UNKNOWN_AGENT_TOOL" };
}

export async function executeAgentToolCalls({
  payload,
  messages,
  user,
  requestResponses,
  agentCloudRequest,
  requireAiOwner
}) {
  const calls = Array.isArray(payload?.output)
    ? payload.output.filter(item => item.type === "function_call") : [];
  if (!calls.length) return { payload, agentActions: [] };

  const toolOutputs = [];
  const agentActions = [];
  for (const call of calls) {
    let result;
    if (calls.length > 1) {
      result = { ok: false, error: "ONE_AGENT_ACTION_PER_MESSAGE" };
    } else {
      try {
        const args = JSON.parse(call.arguments || "{}");
        result = await callAgentChatTool(call.name, args, user, { agentCloudRequest, requireAiOwner });
      } catch (error) {
        result = { ok: false, error: error instanceof Error ? error.message : "AGENT_TOOL_FAILED" };
      }
    }
    if (result?.ok && result.kind === "task_queued") agentActions.push(result);
    toolOutputs.push({
      type: "function_call_output",
      call_id: call.call_id,
      output: JSON.stringify(result || { ok: false, error: "AGENT_TOOL_FAILED" })
    });
  }

  try {
    return {
      payload: await requestResponses([...messages, ...(payload.output || []), ...toolOutputs], false),
      agentActions
    };
  } catch (error) {
    return { payload: null, agentActions, followUpError: error };
  }
}
