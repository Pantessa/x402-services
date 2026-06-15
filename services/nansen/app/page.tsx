export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Nansen MCP</h1>
      <p style={{ color: "#8b93a7", marginTop: 0 }}>
        Smart-money intelligence over MCP. Pay-per-call in USDC on Base. No API key.
        Powered by x402.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 32 }}>Endpoint</h2>
      <pre style={pre}>POST https://nansen.yeetful.com/mcp</pre>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Tools</h2>
      <ul style={{ color: "#cdd3df" }}>
        <li>smart_money_netflows — net USD flows by token, per chain</li>
        <li>smart_money_holdings — current smart-money holdings</li>
        <li>smart_money_dex_trades — recent smart-money DEX trades</li>
        <li>token_flow_intelligence — per-token accumulation vs distribution</li>
        <li>token_who_bought_sold — wallets buying/selling a token</li>
        <li>token_screener — rank tokens by Nansen metrics</li>
      </ul>

      <p style={{ color: "#8b93a7", marginTop: 24 }}>
        Service metadata: <a style={{ color: "#34e0a1" }} href="/api/info">/api/info</a>
      </p>
    </main>
  );
}

const pre: React.CSSProperties = {
  background: "#11141b",
  border: "1px solid #222836",
  borderRadius: 8,
  padding: "10px 14px",
  overflowX: "auto",
};
