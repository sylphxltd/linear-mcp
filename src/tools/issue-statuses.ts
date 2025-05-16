import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { IssueStatusListSchema, IssueStatusQuerySchema, defineTool } from '../schemas/index.js';
import { getLinearClient } from '../utils/linear-client.js';

export const listIssueStatusesTool = defineTool({
  name: 'list_issue_statuses',
  description: 'List available issues statuses in a Linear team',
  inputSchema: IssueStatusListSchema,
  handler: async ({ teamId }) => {
    const linearClient = getLinearClient();
    try {
      const team = await linearClient.team(teamId);
      if (!team) {
        let availableTeamsMessage = '';
        try {
          const allTeams = await linearClient.teams();
          if (allTeams.nodes.length > 0) {
            const teamList = allTeams.nodes.map((t) => ({
              id: t.id,
              name: t.name,
            }));
            availableTeamsMessage = ` Valid teams are: ${JSON.stringify(teamList, null, 2)}`;
          } else {
            availableTeamsMessage = ' No teams available to list.';
          }
        } catch (_listError) {
          availableTeamsMessage = ' (Could not fetch available teams for context.)';
        }
        throw new McpError(
          ErrorCode.InvalidParams,
          `Team with ID '${teamId}' not found when trying to list issue statuses.${availableTeamsMessage}`,
        );
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
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list issue statuses: ${err.message || 'Unknown error'}`,
      );
    }
  },
});

export const getIssueStatusTool = defineTool({
  name: 'get_issue_status',
  description: 'Retrieve details of a specific issue status in Linear by name or ID',
  inputSchema: IssueStatusQuerySchema,
  handler: async ({ query, teamId }) => {
    const linearClient = getLinearClient();
    try {
      const team = await linearClient.team(teamId);
      if (!team) {
        let availableTeamsMessage = '';
        try {
          const allTeams = await linearClient.teams();
          if (allTeams.nodes.length > 0) {
            const teamList = allTeams.nodes.map((t) => ({
              id: t.id,
              name: t.name,
            }));
            availableTeamsMessage = ` Valid teams are: ${JSON.stringify(teamList, null, 2)}`;
          } else {
            availableTeamsMessage = ' No teams available to list.';
          }
        } catch (_listError) {
          availableTeamsMessage = ' (Could not fetch available teams for context.)';
        }
        throw new McpError(
          ErrorCode.InvalidParams,
          `Team with ID '${teamId}' not found when trying to get issue status.${availableTeamsMessage}`,
        );
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
      // If status not found by ID or name, fetch all statuses for this team and include in error message
      const validStatuses = states.nodes.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
      }));
      throw new McpError(
        ErrorCode.InvalidParams,
        `Issue status with query "${query}" not found in team '${team.name}' (${teamId}). Valid statuses for this team are: ${JSON.stringify(validStatuses, null, 2)}`,
      );
    } catch (error: unknown) {
      if (error instanceof McpError) throw error; // Re-throw if already an McpError (e.g. from team validation)
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get issue status: ${err.message || 'Unknown error'}`,
      );
    }
  },
});

export const issueStatusTools = {
  list_issue_statuses: listIssueStatusesTool,
  get_issue_status: getIssueStatusTool,
};
