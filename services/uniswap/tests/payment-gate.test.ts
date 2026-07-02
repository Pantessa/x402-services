import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

describe("uniswap x402 payment gate (v2, clean /mcp path)", () => {
  it("returns HTTP 402 with a v2 PAYMENT-REQUIRED challenge on /mcp", async () => {
    const { proxy } = await import("@/proxy");

    const req = new NextRequest("https://uniswap.test/mcp", {
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
    expect(challenge.resource?.url).toBe("https://uniswap.test/mcp");

    const accept = challenge.accepts[0];
    expect(accept.scheme).toBe("exact");
    expect(accept.network).toBe("eip155:84532");

    // Bazaar discovery advertises the primary tool = quote, schema present.
    const bazaar = challenge.extensions?.bazaar;
    expect(bazaar?.info).toBeTruthy();
    expect(bazaar?.schema).toBeTruthy();
    expect(JSON.stringify(bazaar)).toContain("quote");
  });
});
