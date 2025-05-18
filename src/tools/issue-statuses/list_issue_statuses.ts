import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueStatusListSchema } from './shared.js';
import { throwInternalError } from './shared.js';

export const listIssueStatusesTool = defineTool({
  name: 'list_issue_statuses',
  description: 'List available issues statuses in a Linear team',
  inputSchema: IssueStatusListSchema,
  handler: async ({ teamId }) => {
    try {
      const linearClient = getLinearClient();
      const team = await linearClient.team(teamId);
      if (!team) {
        throw new Error(`Team with ID '${teamId}' not found.`);
      }
      const states = await team.states();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              states.nodes.map((state) => ({
                id: state.id,
                name: state.name,
                color: state.color,
                type: state.type,
                description: state.description,
                position: state.position,
              })),
            ),
          },
        ],
      };
    } catch (error: unknown) {
      throwInternalError('Failed to list issue statuses', error);
    }
  },
});
