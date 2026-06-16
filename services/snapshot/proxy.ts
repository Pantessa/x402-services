// x402 v2 payment gate for the Snapshot DAO MCP service. In Next 16 this
// `proxy.ts` IS the middleware (renamed from middleware.ts). All the payment
// wiring lives in @yeetful/x402-service-kit; this file declares route + discovery.
import { createX402Proxy, mcpDiscovery } from "@yeetful/x402-service-kit";
import { PRIMARY_TOOL } from "@/lib/tools";

const description =
  "Yeetful — Snapshot DAO governance over MCP Streamable HTTP, hosted at snapshot.yeetful.com. Browse proposals/votes/spaces and build an EIP-712 vote the user signs with their own wallet, then relay it. Tools: list_proposals, get_proposal, list_votes, get_space, list_spaces, prepare_vote, submit_vote. Pay-per-call in USDC on Base, no API key. Operated by yeetful.com. Keywords: yeetful, snapshot, dao, governance, proposals, votes, vote, eip712, mcp, x402.";

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
            text: '{"proposals":[{"id":"0xabc…","title":"[AIP-1] …","state":"active","space":{"id":"aave.eth"}}]}',
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
