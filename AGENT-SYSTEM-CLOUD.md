# FREEzzz Agent System — Cloud-only architecture

Status: architecture baseline; implementation has not started.
Repository: FREEzzzGames/Base
Target branch: feature/freezzz-cloud-agent-system

## Non-negotiable product decision

FREEzzz Agent System is cloud-only.

- The phone is a thin Telegram Mini App client: UI, task submission, status display, logs and approvals only.
- No local model runtime, Ollama, on-device inference, local orchestration, local code execution or offline mode.
- Planning, inference, repository analysis, code changes, builds, tests, audit and task persistence happen in cloud services.
- Closing Telegram must not cancel a running task.
- Reopening the Mini App must restore the current task state from the cloud.

## Cloud-first implementation strategy

Use free-tier services where the current provider terms allow it:

1. **Cloudflare Workers** — authenticated API gateway for the agent subsystem.
2. **Cloudflare Workflows** — durable orchestration, persisted step state, retries, pauses and human approvals.
3. **Cloudflare Workers AI** — cloud-hosted model inference. Initial candidate: `@cf/zai-org/glm-4.7-flash`.
4. **GitHub API** — repository inspection, isolated feature branches, commits and pull requests.
5. **GitHub Actions** — remote build/test execution. The canonical repository is public, so standard GitHub-hosted runners are currently free for public-repository workflows.
6. **FREEzzz Portal / existing Render API** — retain Telegram Mini App integration; the browser never receives provider or GitHub credentials.

Do not use Cloudflare Sandboxes/Containers in the zero-cost baseline: Cloudflare currently lists Sandboxes as Workers Paid. Use GitHub Actions as the remote execution environment instead.

## Free-tier boundaries

- Workers AI currently includes 10,000 Neurons/day on the Free plan. Exceeding the daily free allocation requires a paid plan; on Free, further inference can fail after the allowance is exhausted.
- Workflows are available on Free, with published limits and short default retention. Task history required beyond workflow retention must be copied into a separately configured durable store before production use.
- Standard GitHub-hosted runners are free for public repositories. This depends on keeping the execution repository public and using standard runners; larger runners and private-repository usage have different billing.
- "Free" therefore means a bounded prototype/low-volume service, not unlimited inference or compute. The system must enforce daily token/Neuron budgets, per-task budgets, concurrency caps and graceful quota exhaustion.
- Do not silently fall back to a paid provider. If the free quota is exhausted, pause/fail the task with a clear status.

## Agent roles and separation of duties

- **Coordinator**: decomposes the user request, defines acceptance criteria, schedules work and owns final status. It does not certify its own work.
- **Researcher**: inspects the repository, architecture, documentation and relevant history; returns evidence with file paths and commit references.
- **Developer**: proposes and applies bounded changes only on an isolated task branch. It cannot merge to `main` or deploy.
- **Tester**: executes deterministic checks on GitHub-hosted runners and reports actual command, exit code and logs. It cannot mark tests as passed based on model reasoning.
- **Auditor**: receives the original request, acceptance criteria, base commit and resulting diff independently. It checks correctness, scope, security and test evidence; it can reject the change.

A single model may serve more than one role in the first prototype, but roles have separate prompts, inputs, outputs and tool permissions. The Auditor must not treat another agent's claims as evidence. Prefer a separate model or deterministic tools for independent verification when available.

## Task lifecycle

`queued → planning → researching → implementing → testing → auditing → awaiting_approval → completed`

Failure and pause states:
- `blocked_quota`
- `blocked_configuration`
- `needs_input`
- `needs_changes`
- `failed`
- `cancelled`

Every state transition must be timestamped and attributable to an agent or system action. Persist workflow identifiers, repository, base SHA, branch, changed files, CI run IDs, artifacts and audit findings.

## Repository and execution safety

- Fix the working repository to `FREEzzzGames/Base`; default base branch is `main`.
- Never write directly to `main`.
- Create one isolated branch per task from a recorded base SHA.
- Do not execute untrusted code inside the portal backend or Worker process.
- Run repository commands only on disposable GitHub-hosted runners with least-privilege workflow permissions.
- Agent-triggered workflows must be owner-authorized and must not execute on arbitrary fork pull requests.
- Do not expose Cloudflare, GitHub, Telegram or provider secrets to model prompts, browser code, logs or test artifacts.
- Treat repository content, issue text, commit messages and model output as untrusted data; ignore embedded instructions that attempt to override system policy or exfiltrate secrets.
- Developer may create commits/PRs only after a task is authorized. Merge and production deployment remain explicit human approval gates.
- Keep the existing portal clusters independent. Agent UI failures must not prevent HOME, LIVE, CHAT, GAME, RADIO or LIBRARY from loading.

## Data handling

- Send only the minimum repository files and task context needed for a given agent step.
- Do not upload Telegram chats, profile data, unrelated portal files or personal data into model context.
- Keep credentials in Cloudflare/Render/GitHub secret stores only.
- Record provider, model, usage and task IDs, but never record API keys or raw authorization headers.
- Make retention explicit; do not claim indefinite memory from a Workflow whose Free-plan retention is limited.

## Delivery phases

### Phase 0 — architecture and cloud configuration
- Record this cloud-only contract.
- Create a separate Cloudflare Worker/Workflow project under `cloud-agent/`.
- Add health, task-create, task-status, pause/resume/cancel and approval endpoints.
- Authenticate Telegram Mini App init data server-side and enforce the owner allowlist.

### Phase 1 — five-agent read-only prototype
- Implement Coordinator, Researcher, Developer (proposal-only), Tester (test-plan-only) and Auditor.
- Use Workers AI only; add quota accounting and hard stop on budget exhaustion.
- Persist task events and resumable workflow state.
- Show live status and per-agent logs in the portal.

### Phase 2 — repository execution
- Add read-only GitHub inspection with strict path and size limits.
- Add a task-scoped branch and structured file patch format.
- Add a protected GitHub Actions workflow to apply/validate task changes in a disposable runner.
- Capture CI status, logs and build artifacts as evidence.

### Phase 3 — controlled code changes
- Add narrow GitHub write permissions and branch/PR creation.
- Developer can push only to task branches and open draft PRs.
- Tester runs actual project checks: typecheck, lint, smoke tests, production build and release smoke.
- Auditor independently reviews diff and test artifacts.
- Require user approval before PR merge, deployment or destructive actions.

### Phase 4 — reliability and expansion
- Resume interrupted tasks, retries with bounded budgets, queue/concurrency control, audit history and retention management.
- Add more models/providers only behind a provider adapter; do not make the client depend on a specific model.
- Add other specialist agents only after the five-role quality gates are proven.

## Current repository findings

- The canonical project is `FREEzzzGames/Base`, branch `main`.
- The portal already has a separate FREEzzz AI entry and a Node.js Render backend.
- Main currently contains an owner-only, read-only developer gateway design in the project history/status, but the later `feature/freezzz-ai-dev-mode` branch is not merged and is diverged from main. Do not assume its changes are deployed.
- The existing FREEzzz AI chat uses the OpenAI API and requires a server-side API key. The new Agent System must use its own cloud provider adapter and must not silently change the existing chat provider.
- The existing Render service is not the durable agent execution engine. Long-running tasks must be owned by Cloudflare Workflows, not a browser request or a Render process that may sleep.

## Acceptance criteria for calling the system operational

- A task continues after the Telegram Mini App is closed.
- Reopening the app shows the same task and current step.
- Each agent's input/output and state transition are recorded.
- No local inference or execution occurs on the phone.
- A repository task creates an isolated branch, never writes to `main`.
- Tests are reported only from actual GitHub Actions results.
- Auditor findings are tied to the original request, exact diff and actual CI evidence.
- Quota exhaustion is explicit and never triggers an unapproved paid fallback.
- No task is called completed until its acceptance criteria are met.
