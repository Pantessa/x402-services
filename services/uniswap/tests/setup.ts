// Default env for tests. base-sepolia (eip155:84532) so the public x402.org
// facilitator advertises the exact scheme the v2 proxy needs to emit a
// challenge; the envelope shape is identical to mainnet. The Snapshot read API
// needs no key, so none is set here.
process.env.PAYMENT_ADDRESS ??= "0x66268791B55e1F5fA585D990326519F101407257";
process.env.X402_NETWORK ??= "base-sepolia";
process.env.X402_PRICE_USD ??= "0.01";
