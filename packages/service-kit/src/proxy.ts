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
export interface X402ProxyOptions {
  /** Path pattern the gate matches, e.g. "/:transport" for a clean /mcp. */
  routeKey: string;
  /** Human/agent-facing resource description (carries keywords + extra tools). */
  description: string;
  /** Bazaar discovery extension from mcpDiscovery() — `{ bazaar: {...} }`. */
  discovery: Record<string, unknown>;
  maxTimeoutSeconds?: number;
  mimeType?: string;
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

  return paymentProxy(routes, server);
}
