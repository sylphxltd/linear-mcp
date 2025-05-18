import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
// --- Team schema (localized) ---
export const TeamQuerySchema = {
  query: z.string().describe('The UUID or name of the team to retrieve'),
};

export const getTeamTool = defineTool({
  name: 'get_team',
  description: 'Retrieve details of a specific Linear team',
  inputSchema: TeamQuerySchema,
  handler: async ({ query }) => {
    const linearClient = getLinearClient();
    try {
      const team = await linearClient.team(query);
      if (team) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: team.id,
                name: team.name,
                key: team.key,
                description: team.description,
                color: team.color,
                icon: team.icon,
                createdAt: team.createdAt,
                updatedAt: team.updatedAt,
              }),
            },
          ],
        };
      }
    } catch (_error: unknown) {
      // continue to search by name/key
    }
    try {
      const teams = await linearClient.teams({
        filter: {
          or: [{ name: { eq: query } }, { key: { eq: query } }],
        },
      });
      if (teams.nodes.length > 0) {
        const team = teams.nodes[0];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: team.id,
                name: team.name,
                key: team.key,
                description: team.description,
                color: team.color,
                icon: team.icon,
                createdAt: team.createdAt,
                updatedAt: team.updatedAt,
              }),
            },
          ],
        };
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get team: ${err.message || 'Unknown error'}`,
      );
    }
    // If team not found by ID, name, or key, fetch all teams and include in error message
    try {
      const allTeams = await linearClient.teams();
      const validTeams = allTeams.nodes.map((team) => ({
        id: team.id,
        name: team.name,
      }));
      throw new McpError(
        ErrorCode.InvalidParams,
        `Team with query "${query}" not found. Valid teams are: ${JSON.stringify(validTeams, null, 2)}`,
      );
    } catch (listError: unknown) {
      const err = listError as { message?: string };
      // If listing teams also fails, throw a generic not found error
      throw new McpError(
        ErrorCode.InvalidParams,
        `Team with query "${query}" not found. Also failed to list available teams: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
