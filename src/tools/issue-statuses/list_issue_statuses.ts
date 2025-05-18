import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapIssueStatusToOutput, getAvailableStatusesMessage } from './shared.js';
import { getAvailableTeamsMessage } from '../teams/shared.js';

const IssueStatusListSchema = {
  // Required
  teamId: z.string().uuid().describe('Team UUID'),

  // Direct filter parameters
  id: z.string().uuid().optional().describe('Filter by status UUID'),
  name: z.string().optional().describe('Filter by status name (case insensitive)'),
  type: z.enum(['triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled'])
    .optional()
    .describe('Filter by status type'),
    
  // For backward compatibility
  statusName: z.string().optional().describe('Filter by status name (case insensitive)'),
  statusType: z.enum(['triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled'])
    .optional()
    .describe('Filter by status type'),
};

export const listIssueStatusesTool = defineTool({
  name: 'list_issue_statuses',
  description: 'List available issues statuses in a Linear team',
  inputSchema: IssueStatusListSchema,
  handler: async (input) => {
    try {
      const linearClient = getLinearClient();
      
      // Get team
      const team = await linearClient.team(input.teamId);
      if (!team) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Team with ID "${input.teamId}" not found.`,
        );
      }
      
      // Get all states for the team
      const states = await team.states();
      
      // Apply filters in memory (since Linear API doesn't support filtering states directly)
      let filteredStates = states.nodes;
      
      // Apply ID filter if provided
      if (input.id) {
        filteredStates = filteredStates.filter(state => state.id === input.id);
      }
      
      // Apply name filter if provided (support both name and statusName for backward compatibility)
      const nameFilter = input.name || input.statusName;
      if (nameFilter) {
        const nameLower = nameFilter.toLowerCase();
        filteredStates = filteredStates.filter(
          state => state.name.toLowerCase() === nameLower
        );
      }
      
      // Apply type filter if provided (support both type and statusType for backward compatibility)
      const typeFilter = input.type || input.statusType;
      if (typeFilter) {
        filteredStates = filteredStates.filter(state => state.type === typeFilter);
      }
      
      // Map and return results
      return {
        content: [{ type: 'text', text: JSON.stringify(filteredStates.map(mapIssueStatusToOutput)) }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list issue statuses: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  },
});
