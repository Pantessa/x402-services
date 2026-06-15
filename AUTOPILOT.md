# x402-services — autopilot log

## ✅ RUN COMPLETE (2026-06-15 16:08) — all 8 queue items done
Built this run, all verified green, **local commits only** (no remote/deploy):
- **Monorepo** (`x402-services`): pnpm workspace + Turborepo + `@yeetful/x402-service-kit`
  (shared x402 v2 gate, Bazaar discovery, clean-path MCP factory).
- **Nansen MCP service** (`services/nansen`): clean `/mcp` path (no `mcp/mcp`),
  6 tools over the real api.nansen.ai client (key server-side), x402-gated.
  tsc + next build + 11/11 tests (payment-gate + client unit tests) green.
- **Trading-agent `YeetfulSource`** (committed in the trading-agent repo, 9b03fbd):
  pays for Nansen smart-money via the MCP, additive `wSmart` in the strategy
  (free runs byte-identical), graceful degrade. tsc + 9/9 smoke green.

### Needs the OWNER (blocked here by guardrails)
1. **Nansen reseller ToS** — confirm wrapping/reselling Nansen over x402 is
   permitted before listing publicly. Legal go/no-go.
2. **Deploy** — one Vercel project per service (Root Directory `services/<svc>`)
   + its subdomain (e.g. `nansen.yeetful.com`); see README. Set env per project:
   `NANSEN_API_KEY`, `PAYMENT_ADDRESS`, `CDP_API_KEY_ID/SECRET`, `X402_NETWORK=base`.
3. **Push** — decide whether `x402-services` (and the trading-agent commits) go
   to a remote (e.g. a private `Yeetful/x402-services`). Nothing pushed yet.
4. **Run the experiment** — once Nansen is live + a burner funded, set in the
   trading-agent: `MARKET_SOURCE=yeetful`, `NANSEN_MCP_URL`, `YEETFUL_PAYER_KEY`,
   then compare `free:…` vs `yeetful:…` AgentRun outcomes.
5. **anthropic-mcp Bazaar re-index** (separate thread) — its input-schema fix is
   already live; the validator just needs a re-crawl (a fresh CDP-settled payment).

---

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
7. [DONE] (payoff) trading-agent `YeetfulSource` — composes free + Nansen
   smart-money netflow over x402, MARKET_SOURCE=yeetful, additive wSmart in the
   strategy (free runs byte-identical), graceful degrade. Committed in the
   trading-agent repo (9b03fbd). tsc + 9/9 smoke green.
8. [DONE] Nansen client made testable (injectable fetch+key) + 9 unit tests;
   caught & fixed a truncation crash (slicing+reparsing JSON threw on large
   responses). 11/11 tests pass. Skipped the optional generic example service
   (kit already proven; not worth the over-engineering).

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
- 2026-06-15 16:02 — Item 7 DONE (in the trading-agent repo, commit 9b03fbd).
  YeetfulSource pays for Nansen smart-money via the MCP and folds a [-1,1]
  signal into MarketSnapshot; strategy gained an ADDITIVE wSmart term (free runs
  unchanged). nansen-client splits pure logic (parseNetflows/deriveSignal,
  tested) from a guarded MCP-over-HTTP transport (x402-fetch payer when
  YEETFUL_PAYER_KEY set; else degrades). Added x402-fetch + viem to the agent.
  tsc clean; 9/9 smoke checks. Next: item 8 (nansen client mocked-fetch tests +
  discovery polish).
- 2026-06-15 16:08 — Item 8 DONE + RUN COMPLETE. Made nansen.ts testable
  (injectable fetch/key), added 9 unit tests; they caught a real truncation
  crash (JSON slice+reparse throws on large payloads) — fixed to a safe raw
  string preview. 11/11 tests, kit+nansen tsc + build green. Skipped the
  optional example service. All 8 items done; remaining work needs the owner
  (see "RUN COMPLETE" up top). Stopping the loop.
