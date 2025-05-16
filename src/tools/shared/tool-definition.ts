import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { z } from 'zod';

export interface ToolDefinition<T extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  inputSchema: T;
  handler: ToolCallback<T>;
}

export const defineTool = <T extends z.ZodRawShape>(
  tool: ToolDefinition<T>,
): ToolDefinition<T> => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  handler: tool.handler,
});
