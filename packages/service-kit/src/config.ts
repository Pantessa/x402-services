import type { Network } from "@x402/core/types";

// x402 v2 uses CAIP-2 network ids. Map legacy v1 names so X402_NETWORK=base /
// base-sepolia keeps working. (Lifted from the proven anthropic-mcp config.)
export function toCaip2(n: string): Network {
  const map: Record<string, string> = {
    base: "eip155:8453",
    "base-sepolia": "eip155:84532",
  };
  return (map[n] ?? n) as Network;
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * The x402 settings every service shares, read from env. A service supplies its
 * OWN price (X402_PRICE_USD) and pay-to wallet (PAYMENT_ADDRESS) per deployment.
 *
 * No fallback pay-to address — fail loudly if PAYMENT_ADDRESS is unset so a
 * misconfigured deploy never silently routes USDC to the wrong wallet.
 */
export interface X402Config {
  paymentAddress: `0x${string}`;
  network: Network;
  priceUsd: string;
  cdpApiKeyId?: string;
  cdpApiKeySecret?: string;
}

export function loadX402Config(): X402Config {
  return {
    paymentAddress: requiredEnv("PAYMENT_ADDRESS") as `0x${string}`,
    network: toCaip2(process.env.X402_NETWORK ?? "base"),
    priceUsd: process.env.X402_PRICE_USD ?? "0.01",
    // Read directly by @coinbase/x402's `facilitator` from these env vars;
    // surfaced here for validation/debug only.
    cdpApiKeyId: process.env.CDP_API_KEY_ID,
    cdpApiKeySecret: process.env.CDP_API_KEY_SECRET,
  };
}

export function priceString(cfg: X402Config): `$${string}` {
  return `$${cfg.priceUsd}`;
}

/** Bazaar only indexes mainnet services settled through the CDP facilitator. */
export function isBazaarIndexable(cfg: X402Config): boolean {
  return (
    Boolean(cfg.cdpApiKeyId && cfg.cdpApiKeySecret) &&
    cfg.network === "eip155:8453"
  );
}
