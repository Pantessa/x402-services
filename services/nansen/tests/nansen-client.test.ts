import { describe, it, expect } from "vitest";
import { nansenPost, smartMoney, tgm, type NansenOpts } from "@/lib/nansen";

const BASE = "https://api.nansen.ai";
const KEY = "test-key-123";

// A fake fetch that records the last call and returns a canned response.
function recordingFetch(response: {
  status?: number;
  body?: unknown;
  bodyText?: string;
}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string | URL, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const text =
      response.bodyText ?? JSON.stringify(response.body ?? { data: [] });
    return new Response(text, { status: response.status ?? 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

function optsWith(response: Parameters<typeof recordingFetch>[0]) {
  const { impl, calls } = recordingFetch(response);
  const opts: NansenOpts = { fetchImpl: impl, apiKey: KEY };
  return { opts, calls };
}

describe("nansen client — request construction (no network)", () => {
  it("smart_money.netflows: correct path, apikey header, chains body", async () => {
    const { opts, calls } = optsWith({ body: { data: [] } });
    await smartMoney.netflows(["ethereum", "base"], { page: 1, per_page: 10 }, opts);

    expect(calls).toHaveLength(1);
    const { url, init } = calls[0];
    expect(url).toBe(`${BASE}/api/v1/smart-money/netflow`);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).apikey).toBe(KEY);
    expect((init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      chains: ["ethereum", "base"],
      pagination: { page: 1, per_page: 10 },
    });
  });

  it("smart_money.holdings + dexTrades hit their own paths", async () => {
    const h = optsWith({ body: {} });
    await smartMoney.holdings(["solana"], undefined, h.opts);
    expect(h.calls[0].url).toBe(`${BASE}/api/v1/smart-money/holdings`);
    expect(JSON.parse(h.calls[0].init.body as string)).toEqual({
      chains: ["solana"],
      pagination: undefined,
    });

    const d = optsWith({ body: {} });
    await smartMoney.dexTrades(["ethereum"], undefined, d.opts);
    expect(d.calls[0].url).toBe(`${BASE}/api/v1/smart-money/dex-trades`);
  });

  it("tgm.flowIntelligence: chain + token_address body (not chains)", async () => {
    const { opts, calls } = optsWith({ body: { data: {} } });
    await tgm.flowIntelligence("ethereum", "0xABC", opts);

    expect(calls[0].url).toBe(`${BASE}/api/v1/tgm/flow-intelligence`);
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      chain: "ethereum",
      token_address: "0xABC",
    });
  });

  it("tgm.whoBoughtSold sends chain+token+a default date range", async () => {
    const w = optsWith({ body: {} });
    await tgm.whoBoughtSold("base", "0xDEF", { per_page: 5 }, w.opts);
    expect(w.calls[0].url).toBe(`${BASE}/api/v1/tgm/who-bought-sold`);
    const body = JSON.parse(w.calls[0].init.body as string);
    expect(body.chain).toBe("base");
    expect(body.token_address).toBe("0xDEF");
    expect(body.pagination).toEqual({ per_page: 5 });
    // date range is required by Nansen — defaulted to ISO YYYY-MM-DD from/to.
    expect(body.date.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.date.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("tgm.tokenScreener hits the top-level path with a timeframe", async () => {
    const s = optsWith({ body: {} });
    await tgm.tokenScreener(["ethereum", "base"], undefined, s.opts);
    expect(s.calls[0].url).toBe(`${BASE}/api/v1/token-screener`);
    expect(JSON.parse(s.calls[0].init.body as string)).toEqual({
      chains: ["ethereum", "base"],
      timeframe: "24h",
      pagination: undefined,
    });
  });
});

describe("nansen client — response handling", () => {
  it("passes through a JSON body on success", async () => {
    const { opts } = optsWith({ body: { data: [{ symbol: "MORPHO" }] } });
    const r = await nansenPost("/api/v1/smart-money/netflows", { chains: ["ethereum"] }, opts);
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
    expect(r.truncated).toBe(false);
    expect(r.data).toEqual({ data: [{ symbol: "MORPHO" }] });
  });

  it("surfaces a non-2xx status with its body (no throw)", async () => {
    const { opts } = optsWith({ status: 401, body: { error: "unauthorized" } });
    const r = await nansenPost("/api/v1/smart-money/netflows", { chains: ["x"] }, opts);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(401);
    expect(r.data).toEqual({ error: "unauthorized" });
  });

  it("truncates oversized payloads", async () => {
    const big = { data: Array.from({ length: 5000 }, (_, i) => ({ i, pad: "xxxxxxxx" })) };
    const { opts } = optsWith({ body: big });
    const r = await nansenPost("/api/v1/tgm/token-screener", { chains: ["ethereum"] }, opts);
    expect(r.truncated).toBe(true);
    const data = r.data as { note: string; preview: string };
    expect(data.note).toMatch(/truncated/i);
    // preview is a safe raw string slice (never re-parsed → never throws).
    expect(typeof data.preview).toBe("string");
    expect(data.preview.length).toBeLessThanOrEqual(24_000);
  });

  it("keeps a non-JSON body as a string", async () => {
    const { opts } = optsWith({ bodyText: "upstream gateway error" });
    const r = await nansenPost("/api/v1/smart-money/netflows", { chains: ["x"] }, opts);
    expect(r.data).toBe("upstream gateway error");
    expect(r.truncated).toBe(false);
  });

  it("throws when no API key is available", async () => {
    const { impl } = recordingFetch({ body: {} });
    const prev = process.env.NANSEN_API_KEY;
    delete process.env.NANSEN_API_KEY;
    try {
      await expect(
        nansenPost("/api/v1/smart-money/netflows", { chains: ["x"] }, { fetchImpl: impl }),
      ).rejects.toThrow(/NANSEN_API_KEY/);
    } finally {
      if (prev !== undefined) process.env.NANSEN_API_KEY = prev;
    }
  });
});
