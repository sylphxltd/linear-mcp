import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueStatusQuerySchema } from './shared.js';
import { throwInternalError } from './shared.js';

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
              text: JSON.stringify({
                id: state.id,
                name: state.name,
                color: state.color,
                type: state.type,
                description: state.description,
                position: state.position,
              }),
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
