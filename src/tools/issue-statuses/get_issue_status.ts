import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { throwInternalError, mapIssueStatusToOutput } from './shared.js';

const IssueStatusQuerySchema = {
  query: z.string().describe('The UUID or name of the issue status to retrieve'),
  teamId: z.string().describe('The UUID of the team to search for the issue status in'),
};

export const getIssueStatusTool = defineTool({
  name: 'get_issue_status',
  description: 'Retrieve details of a specific issue status in Linear by name or ID',
  inputSchema: IssueStatusQuerySchema,
  handler: async ({ query, teamId }) => {
    try {
      const linearClient = getLinearClient();
      const team = await linearClient.team(teamId);
      if (!team) {
        throw new Error(`Team with ID '${teamId}' not found.`);
      }
      const states = await team.states();
      let state = states.nodes.find((s) => s.id === query);
      if (!state) {
        state = states.nodes.find((s) => s.name.toLowerCase() === query.toLowerCase());
      }
      if (state) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mapIssueStatusToOutput(state)),
            },
          ],
        };
      }
      const validStatuses = states.nodes.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
      }));
      throw new Error(
        `Issue status with query "${query}" not found in team '${team.name}' (${teamId}). Valid statuses for this team are: ${JSON.stringify(validStatuses, null, 2)}`,
      );
    } catch (error: unknown) {
      throwInternalError('Failed to get issue status', error);
    }
  },
});
