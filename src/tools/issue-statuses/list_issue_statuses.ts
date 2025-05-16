import { IssueStatusListSchema, defineTool } from '../../schemas/index.js';
import { validateTeamOrThrow, throwInternalError } from './shared.js';

export const listIssueStatusesTool = defineTool({
  name: 'list_issue_statuses',
  description: 'List available issues statuses in a Linear team',
  inputSchema: IssueStatusListSchema,
  handler: async ({ teamId }) => {
    try {
      const team = await validateTeamOrThrow(teamId);
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