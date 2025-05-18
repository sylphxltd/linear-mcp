import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { throwInternalError, mapIssueStatusToOutput } from './shared.js';

const IssueStatusListSchema = {
  teamId: z.string().describe('The UUID of the team to list issue statuses for'),
};

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
            text: JSON.stringify(states.nodes.map(mapIssueStatusToOutput)),
          },
        ],
      };
    } catch (error: unknown) {
      throwInternalError('Failed to list issue statuses', error);
    }
  },
});
