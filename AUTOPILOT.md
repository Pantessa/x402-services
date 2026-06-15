# x402-services — autopilot log

Self-paced build run started 2026-06-15. Goal: a pnpm-workspace monorepo of
thin x402 services, each deployed to its own Vercel project + subdomain, sharing
one payment/discovery kit. First service: **Nansen** (MCP server + x402 wrapper),
served on a CLEAN single `/mcp` path (no `mcp/mcp` doubling).

Guardrails for the unattended run: build/test/commit LOCALLY only. No remote
push, no Vercel deploy, no real payments, no real Nansen calls (no key). Those
are the owner's call.

## Queue
1. [DONE] Monorepo skeleton — workspace, turbo, tsconfig, gitignore, root pkg.
2. [DONE] `packages/service-kit` — config, createX402Proxy (Next-16 proxy fn),
   mcpDiscovery (bazaar), createCleanMcpHandler (clean /mcp).
3. [DONE] `services/nansen` — Next app, real Nansen client, 6 MCP tools, clean
   `/mcp` route, proxy.ts gate, /api/info, landing, .env.example.
4. [DONE] Tests — payment-gate (clean /mcp path + bazaar input schema) + info.
   2/2 pass.
5. [DONE] Verify — install OK; nansen `tsc` + `next build` GREEN; routes are
   `/[transport]` (→ /mcp), `/api/info`, Proxy middleware active. NO /api/mcp/mcp.
6. [DONE] Polish — README with the Vercel monorepo setup (Root Directory +
   domains) the owner asked about.
7. [ ] (payoff) trading-agent `YeetfulSource` that pings the Nansen MCP for
   smart-money signal on MORPHO/SYRUP/HYPE/SKY — the "does paid data help?" hook.
8. [ ] Stretch: per-tool discovery polish, nansen client unit tests (mocked
   fetch), a generic example service to prove the kit beyond Nansen.

## Nansen API (grounded from docs.nansen.ai/llms-full.txt)
- Base `https://api.nansen.ai`, auth header `apikey: <key>`, all POST + JSON.
- Smart Money: `/api/v1/smart-money/{netflows,holdings,dex-trades,...}` body `{chains:[...]}`.
- TGM: `/api/v1/tgm/{flow-intelligence,who-bought-sold,token-screener,...}` body `{chain,token_address}`.
- Profiler: `/api/v1/profiler/address/{current-balance,pnl,...}` body `{chain,address}`.

## Log
- 2026-06-15 15:20 — Run start. Lifted working x402 v2 wiring from anthropic-mcp
  (proxy.ts IS the Next-16 middleware; @x402/* @ 2.14.0, @coinbase/x402 2.1.0,
  mcp-handler 1.1.0). Confirmed `@x402/extensions/bazaar` exists. Grounded Nansen
  API from their llms-full.txt export. Building items 1–3.
- 2026-06-15 15:35 — Items 1–6 DONE. Build/typecheck/tests green. Gotchas hit +
  fixed: (a) RouteConfig.extensions is `Record<string,unknown>` — typing the
  discovery as `unknown` broke the route type (misleading "accepts missing");
  (b) kit `.js` import specifiers don't resolve under Next's bundler → use
  extensionless (consumed as TS source via transpilePackages); (c) Next-16
  proxy needs a DIRECT `export const proxy = <call>` (not destructured) AND
  `config` must be a STATIC literal — factory returns the proxy fn only, service
  owns the `config` literal. NOTE: `x402: ... invalid bazaar extension: /input:
  must NOT have additional properties` is a PRE-EXISTING, BENIGN warning — the
  proven anthropic-mcp emits it identically and is indexed fine; the full input
  schema is still on the wire (tests assert it). Do not chase it.
  Next: item 7 (trading-agent YeetfulSource) + item 8 polish. Local commits
  only; no push/deploy/payments.
