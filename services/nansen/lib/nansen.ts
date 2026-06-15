// Nansen API client. Grounded in docs.nansen.ai: base https://api.nansen.ai,
// auth via the `apikey` header, every endpoint is POST + JSON. The key is held
// server-side and NEVER exposed to paying clients — they pay per call in USDC
// and we proxy to Nansen with our key.

const NANSEN_BASE = process.env.NANSEN_BASE_URL ?? "https://api.nansen.ai";

// Cap response size returned through MCP so a huge Nansen page can't blow up the
// agent's context (and our egress). Callers can page for more.
const MAX_RESPONSE_CHARS = 24_000;

export interface Pagination {
  page?: number;
  per_page?: number;
}

// Injectable seams for tests — production passes neither (env key, global fetch).
export interface NansenOpts {
  fetchImpl?: typeof fetch;
  apiKey?: string;
}

function resolveKey(opts?: NansenOpts): string {
  const k = opts?.apiKey ?? process.env.NANSEN_API_KEY;
  if (!k) throw new Error("Missing required env var: NANSEN_API_KEY");
  return k;
}

export interface NansenResult {
  ok: boolean;
  status: number;
  data: unknown;
  truncated: boolean;
}

/** POST to a Nansen endpoint with the server-side key. */
export async function nansenPost(
  path: string,
  body: Record<string, unknown>,
  opts?: NansenOpts,
): Promise<NansenResult> {
  const doFetch = opts?.fetchImpl ?? fetch;
  const res = await doFetch(`${NANSEN_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: resolveKey(opts),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  // Trim oversized payloads to keep MCP responses sane. We return a raw string
  // slice rather than re-parsing a cut-off JSON fragment — slicing valid JSON
  // mid-structure yields invalid JSON, so re-parsing would throw and crash the
  // whole call on a large (but perfectly good) response.
  let truncated = false;
  if (typeof data !== "string") {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_RESPONSE_CHARS) {
      truncated = true;
      data = {
        note: `Response truncated to ~${MAX_RESPONSE_CHARS} chars — narrow your query or page for more. \`preview\` is a raw (clipped) JSON string.`,
        preview: serialized.slice(0, MAX_RESPONSE_CHARS),
      };
    }
  }

  return { ok: res.ok, status: res.status, data, truncated };
}

// ── Typed endpoint wrappers ──────────────────────────────────────────────────
// Each accepts an optional trailing NansenOpts (test seam); production callers
// omit it. Smart Money = chain-scoped cohort flows.
export const smartMoney = {
  netflows: (chains: string[], pagination?: Pagination, opts?: NansenOpts) =>
    nansenPost("/api/v1/smart-money/netflows", { chains, pagination }, opts),
  holdings: (chains: string[], pagination?: Pagination, opts?: NansenOpts) =>
    nansenPost("/api/v1/smart-money/holdings", { chains, pagination }, opts),
  dexTrades: (chains: string[], pagination?: Pagination, opts?: NansenOpts) =>
    nansenPost("/api/v1/smart-money/dex-trades", { chains, pagination }, opts),
};

// Token God Mode — per-token analytics (needs a chain + token address).
export const tgm = {
  flowIntelligence: (chain: string, tokenAddress: string, opts?: NansenOpts) =>
    nansenPost("/api/v1/tgm/flow-intelligence", { chain, token_address: tokenAddress }, opts),
  whoBoughtSold: (
    chain: string,
    tokenAddress: string,
    pagination?: Pagination,
    opts?: NansenOpts,
  ) =>
    nansenPost(
      "/api/v1/tgm/who-bought-sold",
      { chain, token_address: tokenAddress, pagination },
      opts,
    ),
  tokenScreener: (chains: string[], pagination?: Pagination, opts?: NansenOpts) =>
    nansenPost("/api/v1/tgm/token-screener", { chains, pagination }, opts),
};
