import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

describe("nansen x402 payment gate (v2, clean /mcp path)", () => {
  it("returns HTTP 402 with a v2 PAYMENT-REQUIRED challenge on /mcp", async () => {
    const { proxy } = await import("@/proxy");

    // The clean path — no /api/mcp/mcp doubling.
    const req = new NextRequest("https://nansen.test/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });

    const res = await proxy(req);
    expect(res).toBeDefined();
    expect(res!.status).toBe(402);

    const header = res!.headers.get("PAYMENT-REQUIRED");
    expect(header).toBeTruthy();
    const challenge = JSON.parse(Buffer.from(header!, "base64").toString("utf8"));

    expect(challenge.x402Version).toBe(2);
    // Resource URL must be the clean /mcp path (what Bazaar will index).
    expect(challenge.resource?.url).toBe("https://nansen.test/mcp");
    expect(challenge.resource?.mimeType).toBe("application/json");

    const accept = challenge.accepts[0];
    expect(accept.scheme).toBe("exact");
    expect(accept.network).toBe("eip155:84532");
    expect(accept.payTo.toLowerCase()).toBe(
      "0x66268791B55e1F5fA585D990326519F101407257".toLowerCase(),
    );
    // 0.01 USDC = 10000 atomic units (6 decimals). v2 uses `amount`.
    expect(accept.amount).toBe("10000");

    // Bazaar discovery in the canonical MCP shape — the field the validator's
    // "INPUT SCHEMA PRESENT" signal reads.
    const bazaar = challenge.extensions?.bazaar;
    expect(bazaar?.info).toBeTruthy();
    expect(bazaar?.schema).toBeTruthy();
    expect(bazaar.info.input.type).toBe("mcp");
    expect(bazaar.info.input.toolName).toBe("smart_money_netflows");
    expect(bazaar.info.input.inputSchema?.properties?.chains).toBeTruthy();
    expect(bazaar.info.input.inputSchema?.required).toContain("chains");
  });

  it("publishes payment + tool details on the public /api/info endpoint", async () => {
    const { GET } = await import("@/app/api/info/route");
    const res = await GET();
    const body = await res.json();

    expect(body.name).toBe("nansen-mcp");
    expect(body.mcpEndpoint).toBe("/mcp");
    expect(body.payment.network).toBe("eip155:84532");
    expect(body.payment.priceUsd).toBe("$0.01");
    expect(body.payment.protocol).toBe("x402");
    expect(body.payment.asset).toBe("USDC");
    expect(body.tools.map((t: { name: string }) => t.name)).toEqual(
      expect.arrayContaining([
        "smart_money_netflows",
        "token_flow_intelligence",
        "token_screener",
      ]),
    );
  });
});
