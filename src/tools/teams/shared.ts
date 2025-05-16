import { z } from 'zod';

// --- Tool definition utility (local copy) ---
export interface ToolDefinition<T extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  inputSchema: T;
  handler: import('@modelcontextprotocol/sdk/server/mcp.js').ToolCallback<T>;
}
export const defineTool = <T extends z.ZodRawShape>(
  tool: ToolDefinition<T>,
): ToolDefinition<T> => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  handler: tool.handler,
});

// --- Team schemas (local copy) ---
export const TeamQuerySchema = {
  query: z.string().describe('The UUID or name of the team to retrieve'),
};
