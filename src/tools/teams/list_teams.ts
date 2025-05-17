import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { isEntityError } from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';

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
            text: JSON.stringify(
              teams.nodes.map((team) => ({
                id: team.id,
                name: team.name,
                key: team.key,
                description: team.description,
                color: team.color,
                icon: team.icon,
                createdAt: team.createdAt,
                updatedAt: team.updatedAt,
              })),
            ),
          },
        ],
      };
    } catch (error: unknown) {
      if (error instanceof McpError) throw error;
      const err = error as Error;
      if (isEntityError(err.message)) {
        // No specific entity ID context for list_teams, so just re-throw the message.
        throw new Error(err.message);
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list teams: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
