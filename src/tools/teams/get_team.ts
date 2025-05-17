import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableTeamsJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { TeamQuerySchema } from './shared.js';

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
    } catch (idError: unknown) {
      const idErr = idError as Error;
      if (isEntityError(idErr.message)) {
        const availableTeams = await getAvailableTeamsJson(linearClient);
        throw new Error(`${idErr.message}\nAvailable teams: ${availableTeams}`);
      }
      // Allow to proceed to search by name/key
    }

    try {
      const teams = await linearClient.teams({
        filter: {
          or: [{ name: { eqIgnoreCase: query } }, { key: { eqIgnoreCase: query } }],
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
    } catch (nameKeyError: unknown) {
      if (nameKeyError instanceof McpError) throw nameKeyError;
      const err = nameKeyError as Error;
      // isEntityError might not be relevant here unless the name/key search itself can cause entity-specific errors
      throw new McpError(
        ErrorCode.InternalError,
        `Error searching teams by name/key "${query}": ${err.message || 'Unknown error'}`,
      );
    }

    // If team not found by ID, name, or key, throw an error with available teams.
    try {
      const availableTeams = await getAvailableTeamsJson(linearClient);
      const notFoundMessage = `Entity not found: Team - Could not find referenced Team with query "${query}".`;
      if (isEntityError(notFoundMessage)) {
        throw new Error(`${notFoundMessage}\nAvailable teams: ${availableTeams}`);
      }
      throw new McpError(
        ErrorCode.InvalidParams,
        `Team with query "${query}" not found. Valid teams are: ${availableTeams}`,
      );
    } catch (finalError: unknown) {
      if (finalError instanceof McpError || finalError instanceof Error) throw finalError;
      throw new McpError(
        ErrorCode.InternalError,
        `Team with query "${query}" not found, and failed to list available teams: ${String(finalError)}`,
      );
    }
  },
});
