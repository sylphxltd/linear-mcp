import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { mapTeamToOutput } from './shared.js';

export const listTeamsTool = defineTool({
  name: 'list_teams',
  description: "List teams in the user's Linear workspace",
  inputSchema: {},
  handler: async () => {
    try {
      const linearClient = getLinearClient();
      const teams = await linearClient.teams();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(teams.nodes.map(mapTeamToOutput)),
          },
        ],
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list teams: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
