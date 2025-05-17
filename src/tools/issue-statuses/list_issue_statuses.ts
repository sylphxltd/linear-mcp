import type { WorkflowState } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableTeamsJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueStatusListSchema } from './shared.js';

export const listIssueStatusesTool = defineTool({
  name: 'list_issue_statuses',
  description: 'List available issues statuses in a Linear team',
  inputSchema: IssueStatusListSchema,
  handler: async ({ teamId }) => {
    const linearClient = getLinearClient();
    try {
      const team = await linearClient.team(teamId);
      if (!team) {
        const availableTeams = await getAvailableTeamsJson(linearClient);
        throw new Error(
          `Team with ID '${teamId}' not found when trying to list issue statuses. Available teams: ${availableTeams}`,
        );
      }
      const states = await team.states();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              states.nodes.map((state: WorkflowState) => ({
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
      if (error instanceof McpError) throw error;
      const err = error as Error;

      if (isEntityError(err.message)) {
        // Primarily, this error would be due to an invalid teamId
        const availableTeams = await getAvailableTeamsJson(linearClient);
        throw new Error(`${err.message}\nAvailable teams: ${availableTeams}`);
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list issue statuses for team "${teamId}": ${err.message || 'Unknown error'}`,
      );
    }
  },
});
