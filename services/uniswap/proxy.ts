// x402 v2 payment gate for the Uniswap MCP service. In Next 16 this
// `proxy.ts` IS the middleware. All payment wiring lives in
// @yeetful/x402-service-kit; this file declares route + discovery.
import { createX402Proxy, mcpDiscovery } from "@yeetful/x402-service-kit";
import { reportUsage } from "yeetful/server";
import { PRIMARY_TOOL } from "@/lib/tools";

const description =
  "Yeetful — Uniswap on Base over MCP Streamable HTTP, hosted at uniswap.yeetful.com. Live on-chain quotes across every v3 fee tier (QuoterV2, no indexer lag), spot prices, pool state for v3 AND v4 (StateView), and deterministic swap-transaction building the user signs with their own wallet: fresh quote → amountOutMinimum with your slippage bound → SwapRouter02 calldata, recipient always the payer, with the approve step and an eth_call dry-run included. Never holds keys, never submits. Tools: quote, price, pool_info, build_swap, build_wrap, build_unwrap, convert_amount. Pay-per-call in USDC on Base, no API key. Operated by yeetful.com. Keywords: yeetful, uniswap, swap, dex, quote, base, v3, v4, defi, transaction, mcp, x402.";

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
            text: '{"sell":{"token":"USDC","amount":"100"},"buy":{"token":"WETH","amount":"0.0612"},"feeTierBps":5,"summary":"Swap 100 USDC → ~0.0612 WETH on Uniswap v3 (Base, 5bps pool)"}',
          },
        ],
      },
    },
  },
});

export const proxy = createX402Proxy({
  routeKey: "/:transport",
  description,
  discovery,
  // Yeetful earn-tracking (fire-and-forget; skipped unless both envs set).
  onSettled: (payment) => {
    const apiKey = process.env.YEETFUL_API_KEY;
    const mcp = process.env.YEETFUL_MCP_SLUG;
    if (!apiKey || !mcp) return;
    void reportUsage({
      apiKey,
      mcp,
      amountUsd: payment.amountUsd,
      payer: payment.payer,
      network: payment.network,
      txHash: payment.txHash,
    });
  },
});

export const config = { matcher: ["/mcp", "/sse"] };
