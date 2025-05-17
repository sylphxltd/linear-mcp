import type { WorkflowState } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableTeamsJson,
  getAvailableStatesJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueStatusQuerySchema } from './shared.js';

export const getIssueStatusTool = defineTool({
  name: 'get_issue_status',
  description: 'Retrieve details of a specific issue status in Linear by name or ID',
  inputSchema: IssueStatusQuerySchema,
  handler: async ({ query, teamId }) => {
    const linearClient = getLinearClient();
    try {
      const team = await linearClient.team(teamId);
      if (!team) {
        // This case should ideally be caught by isEntityError if teamId is invalid
        const availableTeams = await getAvailableTeamsJson(linearClient);
        throw new Error(
          `Team with ID '${teamId}' not found when trying to get issue status. Available teams: ${availableTeams}`,
        );
      }

      const states = await team.states();
      let stateNode = states.nodes.find((s: WorkflowState) => s.id === query);
      if (!stateNode) {
        stateNode = states.nodes.find(
          (s: WorkflowState) => s.name.toLowerCase() === query.toLowerCase(),
        );
      }

      if (stateNode) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: stateNode.id,
                name: stateNode.name,
                color: stateNode.color,
                type: stateNode.type,
                description: stateNode.description,
                position: stateNode.position,
              }),
            },
          ],
        };
      }

      const availableStatesForTeam = await getAvailableStatesJson(linearClient, { teamId });
      throw new Error(
        `Issue status with query "${query}" not found in team '${team.name}' (${teamId}).\nAvailable statuses for this team: ${availableStatesForTeam}`,
      );
    } catch (error: unknown) {
      if (error instanceof McpError) throw error;
      const err = error as Error;

      if (isEntityError(err.message)) {
        let availableEntitiesJson = '[]';
        if (err.message.toLowerCase().includes('team')) {
          availableEntitiesJson = await getAvailableTeamsJson(linearClient);
        } else if (err.message.toLowerCase().includes('state')) {
          // This might be harder to trigger if the primary failure is team not found
          availableEntitiesJson = await getAvailableStatesJson(linearClient, { teamId });
        }
        throw new Error(`${err.message}\nAvailable: ${availableEntitiesJson}`);
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get issue status for query "${query}" in team "${teamId}": ${err.message || 'Unknown error'}`,
      );
    }
  },
});
