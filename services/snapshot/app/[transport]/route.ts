// MCP endpoint on a CLEAN path. With basePath "" this route lives at
// app/[transport] → served at `/mcp` (Streamable HTTP) and `/sse`, i.e.
// snapshot.yeetful.com/mcp — no `/api/mcp/mcp` doubling.
import { createCleanMcpHandler } from "@yeetful/x402-service-kit";
import { registerSnapshotTools } from "@/lib/tools";

const handler = createCleanMcpHandler((server) => {
  registerSnapshotTools(server);
});

export { handler as GET, handler as POST, handler as DELETE };
