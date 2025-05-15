import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { defineTool, TeamQuerySchema } from '../schemas/index.js';
import { getLinearClient } from '../utils/linear-client.js';

export const listTeamsTool = defineTool({
  name: 'list_teams',
  description: 'List teams in the user\'s Linear workspace',
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
              teams.nodes.map(team => ({
                id: team.id,
                name: team.name,
                key: team.key,
                description: team.description,
                color: team.color,
                icon: team.icon,
                createdAt: team.createdAt,
                updatedAt: team.updatedAt,
              }))
            ),
          },
        ],
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list teams: ${err.message || 'Unknown error'}`
      );
    }
  },
});

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
    } catch (error: unknown) {
      // continue to search by name/key
    }
    try {
      const teams = await linearClient.teams({
        filter: {
          or: [
            { name: { eq: query } },
            { key: { eq: query } },
          ],
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
        `Failed to get team: ${err.message || 'Unknown error'}`
      );
    }
    throw new McpError(ErrorCode.MethodNotFound, `Team with ID or name "${query}" not found`);
  },
});

export const teamTools = {
  listTeamsTool,
  getTeamTool,
};