// x402 v2 payment gate for the Nansen MCP service. In Next 16 this `proxy.ts`
// IS the middleware (renamed from middleware.ts). All the payment wiring lives
// in @yeetful/x402-service-kit; this file just declares the route + discovery.
import { createX402Proxy, mcpDiscovery } from "@yeetful/x402-service-kit";
import { PRIMARY_TOOL } from "@/lib/tools";

const description =
  "Yeetful — Nansen smart-money intelligence over MCP Streamable HTTP, hosted at nansen.yeetful.com. Tools: smart_money_netflows, smart_money_holdings, smart_money_dex_trades, token_flow_intelligence, token_who_bought_sold, token_screener. Pay-per-call in USDC on Base, no API key. Operated by yeetful.com. Keywords: yeetful, nansen, smart money, onchain, flows, analytics, mcp, x402.";

const discovery = mcpDiscovery({
  toolName: PRIMARY_TOOL.name,
  description: PRIMARY_TOOL.description,
  transport: "streamable-http",
  inputSchema: PRIMARY_TOOL.inputSchema,
  example: PRIMARY_TOOL.example,
  output: {
    example: {
      jsonrpc: "2.0",
      id: 1,
      result: {
        content: [
          {
            type: "text",
            text: '{"data":[{"token":"MORPHO","chain":"ethereum","netflow_usd":1234567}]}',
          },
        ],
      },
    },
  },
});

// Clean path: gate /mcp and /sse (the [transport] segments). "/:transport" as
// the route key makes the challenge's resource.url report the real /mcp path.
//
// Next 16 requires a DIRECT `export const proxy = <call>` for the middleware
// function, and `config` must be a STATIC object literal (the matcher is parsed
// at build time) — so it lives here, not in the factory return.
export const proxy = createX402Proxy({
  routeKey: "/:transport",
  description,
  discovery,
});

export const config = { matcher: ["/mcp", "/sse"] };
