import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

/**
 * Build the Bazaar discovery extension for an MCP resource.
 *
 * This is the block the agentic.market / Coinbase Bazaar indexer reads for the
 * "INPUT SCHEMA PRESENT" / "OUTPUT SCHEMA PRESENT" quality signals. It MUST be
 * the canonical MCP shape produced by `declareDiscoveryExtension` — a
 * hand-rolled http-shaped block gets rendered as `{}` and flagged "no".
 *
 * `inputSchema` is the JSON Schema of the PRIMARY tool's arguments. A service
 * may expose many tools; declare the most representative one here and mention
 * the rest in the resource `description`. Returns `{ bazaar: { info, schema } }`.
 */
export interface McpDiscoveryInput {
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  example?: Record<string, unknown>;
  output?: { example?: unknown };
  transport?: "streamable-http" | "sse";
}

export function mcpDiscovery(input: McpDiscoveryInput): Record<string, unknown> {
  return declareDiscoveryExtension({
    toolName: input.toolName,
    description: input.description,
    transport: input.transport ?? "streamable-http",
    inputSchema: input.inputSchema,
    example: input.example,
    output: input.output,
  });
}
