// MCP endpoint on a CLEAN path. With basePath "" this route lives at
// app/[transport] → served at `/mcp` (Streamable HTTP) and `/sse`, i.e.
// nansen.yeetful.com/mcp — no `/api/mcp/mcp` doubling.
import { createCleanMcpHandler } from "@yeetful/x402-service-kit";
import { registerNansenTools } from "@/lib/tools";

const handler = createCleanMcpHandler((server) => {
  registerNansenTools(server);
});

export { handler as GET, handler as POST, handler as DELETE };
