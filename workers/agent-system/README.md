# FREEzzz Agent System — Cloud Worker

This worker is the durable cloud execution plane for FREEzzz Portal. It is not a local/offline agent runtime.

## Architecture

- Cloudflare Workers AI runs the five specialist roles. GLM-4.7-Flash handles the team; Gemma 4 26B A4B handles the Independent Auditor as a separate model.
- Cloudflare Workflows persists multi-step execution and continues after the Telegram Mini App closes.
- Cloudflare KV stores task state and agent event history.
- The existing Render Node backend remains the Telegram-authenticated gateway. It forwards only owner-authorized requests to this worker.
- The worker reads a bounded set of public source files from `FREEzzzGames/Base` main. Repository content is treated as untrusted input.

## First-release boundary

The first release performs repository-aware analysis and produces a proposed implementation, test plan, and independent audit. It does not write repository files, create commits, run CI, or deploy. Those capabilities require a separate approval and execution layer and are intentionally not simulated.

## Free-tier limits

The default model is `@cf/zai-org/glm-4.7-flash`. Cloudflare's current documentation lists a 10,000-Neuron daily Workers AI free allocation and Workflows availability on the Free plan. Free Workflows have finite daily step and execution limits; model inference is the likely limiting resource. A Cloudflare account on a paid plan may incur charges after included allowances.

## Deployment

1. Create a Cloudflare API token with permissions to deploy Workers, manage Workers KV namespaces, configure Workflows, and manage Worker secrets.
2. Add these GitHub repository Actions secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `AGENT_BRIDGE_SECRET` — a long random secret; use the same value in Render.
3. Run **Actions → Deploy FREEzzz Agent System → Run workflow**.
4. The deployment workflow creates or reuses the `freezzz-agent-tasks` KV namespace, substitutes its ID in the deployment copy of `wrangler.jsonc`, deploys the Worker/Workflow, and installs `AGENT_BRIDGE_SECRET`.
5. In the existing Render service, set:
   - `AGENT_CLOUD_URL` to the deployed Worker URL (for example, `https://freezzz-agent-system.<your-account-subdomain>.workers.dev`).
   - `AGENT_BRIDGE_SECRET` to the exact same secret used in GitHub Actions.
6. Wait for Render to redeploy. Open FREEzzz AI → AGENTS and verify KV/model status.

Do not place Cloudflare API tokens or bridge secrets in frontend code, repository files, or chat messages.

## API

The worker exposes only an internal bridge API protected by `AGENT_BRIDGE_SECRET`:

- `GET /health`
- `GET /internal/status`
- `POST /internal/tasks`
- `GET /internal/tasks?userId=<telegram-user-id>`
- `GET /internal/tasks/<uuid>?userId=<telegram-user-id>`

The public portal does not call these routes directly; it calls the existing Render backend, which validates Telegram initData and the owner ID first.
