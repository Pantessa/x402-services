import { NextResponse } from "next/server";
import { loadX402Config, priceString, isBazaarIndexable } from "@yeetful/x402-service-kit";

// Free, unauthenticated discovery surface — what this service is and how to pay.
export async function GET() {
  let payment: Record<string, unknown> = { error: "PAYMENT_ADDRESS not configured" };
  try {
    const cfg = loadX402Config();
    payment = {
      network: cfg.network,
      priceUsd: priceString(cfg),
      payTo: cfg.paymentAddress,
      protocol: "x402",
      asset: "USDC",
      facilitator: cfg.cdpApiKeyId && cfg.cdpApiKeySecret ? "coinbase-cdp" : "x402.org-public",
      bazaarIndexable: isBazaarIndexable(cfg),
    };
  } catch {
    /* leave the error payload */
  }

  return NextResponse.json({
    name: "uniswap-mcp",
    upstream: "Uniswap v3 + v4 contracts on Base, read directly over RPC (no API key, no indexer)",
    mcpEndpoint: "/mcp",
    payment,
    tools: [
      { name: "quote", description: "Live exact-in quote across every v3 fee tier (QuoterV2)." },
      { name: "price", description: "Spot price from the most liquid v3 pool." },
      { name: "pool_info", description: "v3 pools per tier + canonical hookless v4 pools (StateView)." },
      { name: "build_swap", description: "Deterministic swap tx to sign: fresh quote → min-out → SwapRouter02 calldata + approve step + dry-run." },
      { name: "build_wrap", description: "ETH → WETH deposit tx." },
      { name: "build_unwrap", description: "WETH → ETH withdraw tx." },
      { name: "convert_amount", description: "Human amount ↔ atoms with real on-chain decimals." },
    ],
    safety:
      "Builds only — never holds keys, never signs, never submits. Swap recipient is always the payer. Designed to flow into Yeetful's guardrail + sign pipeline.",
  });
}
