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
  // Keep info.input MINIMAL — { type, toolName, inputSchema }. Although
  // @x402/extensions happily emits AND self-validates the optional
  // description/transport/example keys, agentic.market's stricter
  // `discover_resource` parser rejects them ("input has an unrecognized shape"
  // → invalid discovery configuration). The minimal shape is the intersection
  // every consumer accepts. The human-readable description lives on the resource
  // (resource.description); we keep the output example (a sibling of input).
  return declareDiscoveryExtension({
    toolName: input.toolName,
    inputSchema: input.inputSchema,
    output: input.output,
  });
}
