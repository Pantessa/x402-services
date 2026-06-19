import { paymentProxy, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { facilitator as cdpFacilitator } from "@coinbase/x402";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { loadX402Config, priceString } from "./config";

/**
 * Build the x402 **v2** Next-16 proxy (the file that exports this becomes the
 * service's `proxy.ts` middleware). This is the single shared copy of the
 * payment-gate wiring — proven against anthropic-mcp + the Bazaar validator.
 *
 * v2 emits: x402Version 2, a top-level `resource` object, `amount` (not
 * `maxAmountRequired`), the challenge in a base64 `PAYMENT-REQUIRED` header,
 * and a top-level `extensions.bazaar` discovery block when `extensions` is set.
 *
 * Bazaar only indexes services settled through the CDP facilitator on Base
 * mainnet, so we use @coinbase/x402's `facilitator` (CDP_API_KEY_ID/SECRET)
 * when present and fall back to the public x402.org facilitator (testnet, not
 * indexed) for local dev.
 */
/**
 * Normalized facts about one settled payment, handed to
 * {@link X402ProxyOptions.onSettled}. Decoupled from the x402 wire types so
 * callers (earn-tracking, analytics) don't have to import @x402/core.
 */
export interface SettledPayment {
  /** The call's price in US dollars (the configured X402_PRICE_USD) as a number. */
  amountUsd: number;
  /** The paying agent's wallet address, if the facilitator exposed it. */
  payer?: string;
  /** The on-chain settlement transaction hash, if present. */
  txHash?: string;
  /** Human network name as configured (e.g. "base"), not a CAIP-2 id. */
  network: string;
}

export interface X402ProxyOptions {
  /** Path pattern the gate matches, e.g. "/:transport" for a clean /mcp. */
  routeKey: string;
  /** Human/agent-facing resource description (carries keywords + extra tools). */
  description: string;
  /** Bazaar discovery extension from mcpDiscovery() — `{ bazaar: {...} }`. */
  discovery: Record<string, unknown>;
  maxTimeoutSeconds?: number;
  mimeType?: string;
  /**
   * Fired AFTER a payment settles successfully, with normalized facts. Use it
   * for fire-and-forget side effects (e.g. Yeetful earn-tracking) — do NOT do
   * slow awaited work here: it runs inside the settle path, so hand any I/O to a
   * background primitive and return. Thrown errors are swallowed so a side
   * effect can never break or fail the paid response.
   */
  onSettled?: (payment: SettledPayment) => void;
}

// Returns the proxy FUNCTION only. The service's proxy.ts must export `config`
// as its own STATIC object literal (Next statically parses the matcher at build
// — a value returned from here isn't parseable).
export function createX402Proxy(opts: X402ProxyOptions) {
  const cfg = loadX402Config();

  const routes = {
    [opts.routeKey]: {
      accepts: {
        scheme: "exact",
        price: priceString(cfg),
        network: cfg.network,
        payTo: cfg.paymentAddress,
        maxTimeoutSeconds: opts.maxTimeoutSeconds ?? 60,
      },
      description: opts.description,
      mimeType: opts.mimeType ?? "application/json",
      extensions: opts.discovery,
    },
  };

  const cdpReady = !!cfg.cdpApiKeyId && !!cfg.cdpApiKeySecret;
  const facilitatorClient = new HTTPFacilitatorClient(
    cdpReady ? cdpFacilitator : { url: "https://x402.org/facilitator" },
  );

  const server = new x402ResourceServer(facilitatorClient)
    .register(cfg.network, new ExactEvmScheme())
    // Validates/normalizes the bazaar payload on the way out; without it the
    // extension can be emitted unrecognized (stripped to `{}`).
    .registerExtension(bazaarResourceServerExtension);

  // Earn-tracking / analytics hook. Fires only on a SUCCESSFUL settlement; the
  // exact scheme settles the full configured price, so amountUsd is cfg.priceUsd
  // (NOT result.amount, which is atomic units and only set for `upto`). We pass
  // the human network name from env, not result.network (a CAIP-2 id). Wrapped
  // so a side effect can never break settlement or slow the paid response.
  if (opts.onSettled) {
    const onSettled = opts.onSettled;
    server.onAfterSettle(async (ctx) => {
      try {
        if (!ctx.result?.success) return;
        onSettled({
          amountUsd: Number(cfg.priceUsd),
          payer: ctx.result.payer,
          txHash: ctx.result.transaction,
          network: process.env.X402_NETWORK ?? "base",
        });
      } catch {
        /* telemetry must never surface to the caller */
      }
    });
  }

  return paymentProxy(routes, server);
}
