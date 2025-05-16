import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { LabelListSchema, defineTool } from '../../schemas/index.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { formatLabelNodes, getAvailableTeamsMessage } from './shared.js';

export const listIssueLabelsTool = defineTool({
  name: 'list_issue_labels',
  description: 'List available issue labels in a Linear team',
  inputSchema: LabelListSchema,
  handler: async ({ teamId }) => {
    const linearClient = getLinearClient();
    try {
      const team = await linearClient.team(teamId);
      if (!team) {
        const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
        throw new McpError(
          ErrorCode.InvalidParams,
          `Team with ID '${teamId}' not found when trying to list labels.${availableTeamsMessage}`,
        );
      }
      const labels = await team.labels();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formatLabelNodes(labels.nodes)),
          },
        ],
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list issue labels: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
