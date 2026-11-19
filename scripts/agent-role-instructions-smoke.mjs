import { readFile } from "node:fs/promises";

const worker = await readFile("workers/agent-system/src/index.js", "utf8");
const jobDescriptions = await readFile("workers/agent-system/AGENT-ROLE-INSTRUCTIONS.md", "utf8");
const expected = [
  ["coordinator", "критерии приёмки", "вердикт аудитора", "невыполненные действия"],
  ["researcher", "фактически переданные файлы", "Разделяй факты, выводы и гипотезы"],
  ["developer", "минимально достаточное техническое решение", "не создаёшь коммиты/PR/сборки"],
  ["tester", "позитивные, негативные, граничные", "не называй их пройденными"],
  ["auditor", "критическую проверку", "принять с условиями", "отклонить"]
];
const documentedRoleNames = {
  coordinator: "Координатор",
  researcher: "Исследователь",
  developer: "Разработчик",
  tester: "Тестировщик",
  auditor: "Независимый аудитор"
};

for (const [role, ...phrases] of expected) {
  const roleStart = worker.indexOf(`key: "${role}"`);
  if (roleStart < 0) throw new Error(`Agent role missing from Worker: ${role}`);
  const objectiveStart = worker.indexOf("objective:", roleStart);
  const nextRole = worker.indexOf("key:", roleStart + 1);
  const roleDefinition = worker.slice(objectiveStart, nextRole < 0 ? worker.length : nextRole);
  for (const phrase of phrases) {
    if (!roleDefinition.includes(phrase)) throw new Error(`Instruction missing for ${role}: ${phrase}`);
  }
  if (!jobDescriptions.includes(documentedRoleNames[role])) {
    throw new Error(`Job description missing for ${role}`);
  }
}

if (!worker.includes(String.raw`"\n\nТВОЯ РОЛЬ: " + role.title + "\nОТВЕТСТВЕННОСТЬ: " + role.objective`)) {
  throw new Error("Role objective is not added to each model request");
}
if (!worker.includes('AGENTS[0].objective')) {
  throw new Error("Coordinator's final report does not receive the coordinator instruction");
}
if (!worker.includes("только read-only контекст")) {
  throw new Error("Global read-only authority boundary missing from system prompt");
}

console.log("AGENT_ROLE_INSTRUCTIONS_SMOKE_OK");
