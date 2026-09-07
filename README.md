[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/yeetful-x402-services-badge.png)](https://mseep.ai/app/yeetful-x402-services)

# x402-services

Yeetful's fleet of **x402-monetized services** — one repo, many thin services,
each deployed to its own Vercel project + subdomain, all sharing one
payment/discovery kit. Agents pay per call in USDC on Base; no API keys.

```
packages/service-kit/     shared x402 v2 payment gate + Bazaar discovery + clean-path MCP factory
services/nansen/          Nansen smart-money intelligence as MCP   → nansen.yeetful.com/mcp
services/snapshot/        Snapshot DAO governance as MCP           → snapshot.yeetful.com/mcp
services/uniswap/         Uniswap quotes + swap-tx building as MCP → uniswap.yeetful.com/mcp
```

> `anthropic-mcp` lives in its own repo for now (it's live + earning). New
> services start here. The kit owns the payment wiring so an x402 version bump
> is one PR, not N repos.

## The shared kit (`@yeetful/x402-service-kit`)
A service is a thin adapter; the kit provides:
- `loadX402Config()` — env-driven pay-to / network / price / CDP facilitator.
- `createX402Proxy({ routeKey, description, discovery })` — the Next-16 `proxy.ts`
  payment-gate function (x402 v2, CDP facilitator on Base, Bazaar extension).
- `mcpDiscovery({ toolName, inputSchema, ... })` — the canonical Bazaar discovery
  block (what the validator's "input schema present" signal reads).
- `createCleanMcpHandler(register)` — MCP handler served at a clean `/mcp`
  (no `/api/mcp/mcp` doubling), via `app/[transport]/route.ts`.

## Clean MCP path
Each MCP service exposes `https://<service>.yeetful.com/mcp` (Streamable HTTP)
and `/sse`. The handler lives at `app/[transport]/route.ts` with an empty
basePath, so the single visible `/mcp` is the transport name — not a redundant
`/api/mcp` prefix.

## Deploying on Vercel (one repo → many projects)
The mental model: a Vercel **Project** points at a **folder inside** this repo.
Create one project per service:

1. Push this repo to GitHub.
2. Vercel → **Add New → Project → Import** this repo.
3. Set **Root Directory** to the service, e.g. `services/nansen`.
   Vercel auto-detects Next.js + pnpm, installs the whole workspace (so
   `@yeetful/x402-service-kit` resolves), and builds just that app.
4. Add the service's **env vars** (see its `.env.example`) — only that
   service's keys live in its project.
5. **Domains** → add `nansen.yeetful.com`. Since `yeetful.com` already resolves
   on Vercel, this is one click (or one `CNAME → cname.vercel-dns.com` if DNS
   lives elsewhere). SSL is automatic.
6. Repeat per service. Turborepo makes Vercel skip rebuilding projects whose
   files didn't change.

A bad deploy of one service can't touch another — separate projects, separate
domains, separate envs.

## Local dev
```bash
pnpm install
pnpm --filter nansen-mcp dev      # or: cd services/nansen && pnpm dev
pnpm typecheck                    # whole workspace
pnpm --filter nansen-mcp test     # payment-gate + info tests
```
Copy `services/<svc>/.env.example` → `.env` and fill it in. `.env` is gitignored
— never commit real keys.

## Guardrails
Nothing here moves real funds. Services hold their upstream key server-side and
charge per call; clients never see the key. Reselling third-party data (e.g.
Nansen) may be restricted by that provider's ToS — clear it before listing
publicly.
