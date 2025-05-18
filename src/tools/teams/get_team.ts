import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { mapTeamToOutput, getAvailableTeamsMessage } from './shared.js';

const TeamQuerySchema = {
  query: z.string().describe('Team ID, name, or key'),
};

export const getTeamTool = defineTool({
  name: 'get_team',
  description: 'Retrieve details of a specific Linear team',
  inputSchema: TeamQuerySchema,
  handler: async ({ query }) => {
    const linearClient = getLinearClient();
    let team;

    try {
      // Try to find team by ID first
      team = await linearClient.team(query);
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

      // If not found by ID, try to find by name or key
      const teams = await linearClient.teams({
        filter: {
          or: [
            { name: { eq: query } },
            { key: { eq: query } },
          ],
        },
      });

      if (teams.nodes.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mapTeamToOutput(teams.nodes[0])),
            },
          ],
        };
      }

      // If team not found, include available teams in error message
      const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
      throw new McpError(
        ErrorCode.InvalidParams,
        `Team not found with query "${query}".${availableTeamsMessage}`,
      );
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get team: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  },
});
