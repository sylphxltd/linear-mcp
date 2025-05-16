import type { Issue, IssueLabel, Team } from '@linear/sdk';
import type { LinearClient } from '@linear/sdk';
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

// --- Label schemas (local copy) ---
export const LabelListSchema = {
  teamId: z.string().describe('The team UUID'),
};

/**
 * Fetches a message listing all available teams, or a fallback message if none found.
 */
export async function getAvailableTeamsMessage(linearClient: LinearClient): Promise<string> {
  try {
    const allTeams = await linearClient.teams();
    if (allTeams.nodes.length > 0) {
      const teamList = allTeams.nodes.map((t: Team) => ({
        id: t.id,
        name: t.name,
      }));
      return ` Valid teams are: ${JSON.stringify(teamList, null, 2)}`;
    }
    return ' No teams available to list.';
  } catch {
    return ' (Could not fetch available teams for context.)';
  }
}

/**
 * Formats an array of label nodes for output.
 */
export function formatLabelNodes(labels: IssueLabel[]): object[] {
  return labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description,
    createdAt:
      label.createdAt instanceof Date
        ? label.createdAt.toISOString()
        : typeof label.createdAt === 'string'
          ? label.createdAt
          : undefined,
    updatedAt:
      label.updatedAt instanceof Date
        ? label.updatedAt.toISOString()
        : typeof label.updatedAt === 'string'
          ? label.updatedAt
          : undefined,
  }));
}
