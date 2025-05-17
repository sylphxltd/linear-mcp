import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableTeamsJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { LabelListSchema, formatLabelNodes } from './shared.js';

export const listIssueLabelsTool = defineTool({
  name: 'list_issue_labels',
  description: 'List available issue labels in a Linear team',
  inputSchema: LabelListSchema,
  handler: async ({ teamId }) => {
    const linearClient = getLinearClient();
    try {
      const team = await linearClient.team(teamId);
      if (!team) {
        const availableTeams = await getAvailableTeamsJson(linearClient);
        throw new Error(
          `Team with ID '${teamId}' not found when trying to list labels.\nAvailable teams: ${availableTeams}`,
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
      if (error instanceof McpError) throw error;
      const err = error as Error;

      if (isEntityError(err.message)) {
        // Primarily, this error would be due to an invalid teamId
        const availableTeams = await getAvailableTeamsJson(linearClient);
        throw new Error(`${err.message}\nAvailable teams: ${availableTeams}`);
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list issue labels for team "${teamId}": ${err.message || 'Unknown error'}`,
      );
    }
  },
});
