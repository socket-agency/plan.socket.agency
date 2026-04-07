export type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

/**
 * Extra context passed to tool handlers by the MCP server.
 *
 * Defined locally to avoid importing RequestHandlerExtra, whose
 * generic parameters pull in the Zod v3/v4 union types that cause
 * infinite type instantiation (TS2589) during `tsc`.
 */
interface ToolExtra {
  signal: AbortSignal;
  authInfo?: AuthInfo;
  sessionId?: string;
}

type ToolInput = Record<string, z.ZodTypeAny>;

type ToolHandler<T extends ToolInput> = (
  args: { [K in keyof T]: z.infer<T[K]> },
  extra: ToolExtra,
) => CallToolResult | Promise<CallToolResult>;

/**
 * Type-safe wrapper around `McpServer.tool()` that avoids the deep
 * type instantiation caused by the SDK's `AnySchema` (Zod v3 | v4)
 * union in `ToolCallback` / `ShapeOutput`.
 *
 * Uses `z.infer` directly (single Zod version) instead of the SDK's
 * `SchemaOutput` which checks both `z3.ZodTypeAny` and `z4.$ZodType`.
 */
export function defineTool<T extends ToolInput>(
  server: McpServer,
  name: string,
  description: string,
  schema: T,
  handler: ToolHandler<T>,
): void {
  (server.tool as Function)(name, description, schema, handler);
}
