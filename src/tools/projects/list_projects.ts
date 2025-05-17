import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableTeamsJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { ProjectFilterSchema } from './shared.js';

export const listProjectsTool = defineTool({
  name: 'list_projects',
  description: "List projects in the user's Linear workspace",
  inputSchema: ProjectFilterSchema,
  handler: async ({ limit, before, after, includeArchived, teamId }) => {
    const linearClient = getLinearClient();
    try {
      // No pre-validation for teamId, let the SDK call fail if teamId is invalid
      const filters: Record<string, unknown> = {
        first: limit,
        includeArchived,
      };
      if (teamId) filters.filter = { ...(filters.filter as object || {}), team: { id: { eq: teamId } } };
      if (before) filters.before = before;
      if (after) filters.after = after;

      const projectsConnection = await linearClient.projects(filters);
      const projects = await Promise.all(
        projectsConnection.nodes.map(async (projectFetch) => {
          const project = await projectFetch;
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            content: project.content,
            icon: project.icon,
            color: project.color,
            state: project.state,
            startDate: project.startDate,
            targetDate: project.targetDate,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            url: project.url,
          };
        }),
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projects),
          },
        ],
      };
    } catch (error: unknown) {
      if (error instanceof McpError) throw error;
      const err = error as Error;
      if (isEntityError(err.message)) {
        let availableEntitiesJson = '[]';
        // If the error is about a teamId, provide available teams.
        if (teamId && err.message.toLowerCase().includes('team')) {
          availableEntitiesJson = await getAvailableTeamsJson(linearClient);
        }
        throw new Error(`${err.message}\nAvailable: ${availableEntitiesJson}`);
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list projects: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
