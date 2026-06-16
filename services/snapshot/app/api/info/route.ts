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
    name: "snapshot-mcp",
    upstream: "Snapshot (hub.snapshot.org)",
    mcpEndpoint: "/mcp",
    payment,
    tools: [
      { name: "list_proposals", description: "Recent DAO proposals (filter by space + state)." },
      { name: "get_proposal", description: "Full detail for one proposal." },
      { name: "list_votes", description: "Votes cast on a proposal, by voting power." },
      { name: "get_space", description: "DAO space metadata." },
      { name: "list_spaces", description: "Browse DAO spaces." },
      { name: "prepare_vote", description: "Build the EIP-712 vote for the user to sign." },
      { name: "submit_vote", description: "Relay a user-signed vote to the Snapshot sequencer." },
    ],
  });
}
