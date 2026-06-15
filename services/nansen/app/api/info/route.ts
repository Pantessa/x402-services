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
    name: "nansen-mcp",
    upstream: "Nansen (api.nansen.ai)",
    mcpEndpoint: "/mcp",
    payment,
    tools: [
      { name: "smart_money_netflows", description: "Net USD flows by token from the smart-money cohort, per chain." },
      { name: "smart_money_holdings", description: "Current smart-money token holdings, per chain." },
      { name: "smart_money_dex_trades", description: "Recent smart-money DEX trades, per chain." },
      { name: "token_flow_intelligence", description: "Per-token smart-money flow (accumulation vs distribution)." },
      { name: "token_who_bought_sold", description: "Notable wallets buying/selling a specific token." },
      { name: "token_screener", description: "Screen/rank tokens by Nansen metrics across chains." },
    ],
  });
}
