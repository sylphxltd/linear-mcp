import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapIssueStatusToOutput, getAvailableStatusesMessage } from './shared.js';
import { getAvailableTeamsMessage } from '../teams/shared.js';

const IssueStatusQuerySchema = {
  teamId: z.string().describe('Team UUID'),
  statusId: z.string().uuid().optional().describe('Status UUID'),
  statusName: z.string().optional().describe('Status name (case insensitive)'),
};

type IssueStatusInput = {
  teamId: string;
  statusId?: string;
  statusName?: string;
};

export const getIssueStatusTool = defineTool({
  name: 'get_issue_status',
  description: 'Retrieve details of a specific issue status in Linear by name or ID',
  inputSchema: IssueStatusQuerySchema,
  handler: async ({ teamId, statusId, statusName }: IssueStatusInput) => {
    try {
      const linearClient = getLinearClient();
      const team = await linearClient.team(teamId);
      if (!statusId && !statusName) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Must provide either statusId or statusName',
        );
      }

      if (!team) {
        const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
        throw new McpError(
          ErrorCode.InvalidParams,
          `Team with ID '${teamId}' not found.${availableTeamsMessage}`,
        );
      }

      const states = await team.states();
      let state = undefined;

      if (statusId) {
        state = states.nodes.find((s) => s.id === statusId);
      } else if (statusName) {
        state = states.nodes.find(
          (s) => s.name.toLowerCase() === statusName.toLowerCase(),
        );
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

      const availableStatusesMessage = await getAvailableStatusesMessage(states.nodes);
      throw new McpError(
        ErrorCode.InvalidParams,
        `Issue status not found in team '${team.name}'.${availableStatusesMessage}`,
      );
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get issue status: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  },
});
