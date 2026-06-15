import { z } from "zod";
import type { createMcpHandler } from "mcp-handler";
import { smartMoney, tgm, type NansenResult } from "./nansen";

// Chains Nansen commonly supports. Accepted as free strings (Nansen validates),
// but documented here so agents pick valid values.
const CHAINS = [
  "ethereum",
  "base",
  "solana",
  "arbitrum",
  "optimism",
  "polygon",
  "bsc",
  "avalanche",
] as const;

const chainsArg = z
  .array(z.string())
  .min(1)
  .describe(`Chains to query, e.g. ${CHAINS.slice(0, 4).join(", ")}.`);

const paginationArg = z
  .object({
    page: z.number().int().min(1).optional(),
    per_page: z.number().int().min(1).max(100).optional(),
  })
  .optional()
  .describe("Optional pagination. Defaults to the first page.");

function present(result: NansenResult) {
  if (!result.ok) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Nansen API error (HTTP ${result.status}): ${JSON.stringify(result.data)}`,
        },
      ],
      isError: true,
    };
  }
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result.data) }],
  };
}

type Server = Parameters<Parameters<typeof createMcpHandler>[0]>[0];

/** Register the Nansen MCP tool surface on a server. */
export function registerNansenTools(server: Server): void {
  // ── Smart Money (cohort-wide, chain-scoped) ────────────────────────────────
  server.registerTool(
    "smart_money_netflows",
    {
      title: "Smart Money Net Flows",
      description:
        "Net USD inflows/outflows by token from Nansen's tracked smart-money cohort, per chain. The headline 'what is smart money buying/selling' signal.",
      inputSchema: { chains: chainsArg, pagination: paginationArg },
    },
    async ({ chains, pagination }) => present(await smartMoney.netflows(chains, pagination)),
  );

  server.registerTool(
    "smart_money_holdings",
    {
      title: "Smart Money Holdings",
      description: "Current token holdings of the smart-money cohort, per chain.",
      inputSchema: { chains: chainsArg, pagination: paginationArg },
    },
    async ({ chains, pagination }) => present(await smartMoney.holdings(chains, pagination)),
  );

  server.registerTool(
    "smart_money_dex_trades",
    {
      title: "Smart Money DEX Trades",
      description: "Recent DEX trades executed by smart-money wallets, per chain.",
      inputSchema: { chains: chainsArg, pagination: paginationArg },
    },
    async ({ chains, pagination }) => present(await smartMoney.dexTrades(chains, pagination)),
  );

  // ── Token God Mode (single token) ──────────────────────────────────────────
  const chainArg = z.string().min(1).describe("Single chain, e.g. ethereum or base.");
  const tokenArg = z
    .string()
    .min(1)
    .describe("Token contract address on that chain.");

  server.registerTool(
    "token_flow_intelligence",
    {
      title: "Token Flow Intelligence",
      description:
        "Smart-money flow intelligence for ONE token (accumulation vs distribution, who's flowing in/out). The per-token signal most useful for a trading decision.",
      inputSchema: { chain: chainArg, token_address: tokenArg },
    },
    async ({ chain, token_address }) =>
      present(await tgm.flowIntelligence(chain, token_address)),
  );

  server.registerTool(
    "token_who_bought_sold",
    {
      title: "Who Bought / Sold a Token",
      description:
        "Notable wallets that recently bought or sold a specific token — accumulation/distribution detail behind the flow signal.",
      inputSchema: { chain: chainArg, token_address: tokenArg, pagination: paginationArg },
    },
    async ({ chain, token_address, pagination }) =>
      present(await tgm.whoBoughtSold(chain, token_address, pagination)),
  );

  server.registerTool(
    "token_screener",
    {
      title: "Token Screener",
      description:
        "Screen/rank tokens by Nansen metrics across chains (momentum, smart-money interest, liquidity).",
      inputSchema: { chains: chainsArg, pagination: paginationArg },
    },
    async ({ chains, pagination }) => present(await tgm.tokenScreener(chains, pagination)),
  );
}

// JSON Schema for the PRIMARY tool, used in the Bazaar discovery extension. Kept
// in sync with smart_money_netflows above (this is what the validator reads).
export const PRIMARY_TOOL = {
  name: "smart_money_netflows",
  description:
    "Net USD inflows/outflows by token from Nansen's smart-money cohort, per chain. Other tools on this endpoint: smart_money_holdings, smart_money_dex_trades, token_flow_intelligence, token_who_bought_sold, token_screener.",
  inputSchema: {
    type: "object",
    properties: {
      chains: {
        type: "array",
        items: { type: "string" },
        description: "Chains to query, e.g. ethereum, base, solana.",
      },
      pagination: {
        type: "object",
        properties: {
          page: { type: "number" },
          per_page: { type: "number" },
        },
      },
    },
    required: ["chains"],
    additionalProperties: false,
  },
  example: { chains: ["ethereum", "base"], pagination: { page: 1, per_page: 10 } },
} as const;
