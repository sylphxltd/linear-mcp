import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { mapTeamToOutput, getAvailableTeamsMessage } from './shared.js';

const TeamQuerySchema = {
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
              text: JSON.stringify(mapTeamToOutput(team)),
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
              text: JSON.stringify(mapTeamToOutput(team)),
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
    // If team not found by ID, name, or key, include available teams in error message
    const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
    throw new McpError(
      ErrorCode.InvalidParams,
      `Team with query "${query}" not found.${availableTeamsMessage}`,
    );
  },
});
