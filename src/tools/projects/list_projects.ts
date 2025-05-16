import { ProjectFilterSchema, defineTool } from './shared.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { validateTeamIdOrThrow } from './shared.js';

export const listProjectsTool = defineTool({
  name: 'list_projects',
  description: "List projects in the user's Linear workspace",
  inputSchema: ProjectFilterSchema,
  handler: async (args) => {
    try {
      const { limit, before, after, includeArchived, teamId } = args;
      const linearClient = getLinearClient();

      if (teamId) {
        await validateTeamIdOrThrow(linearClient, teamId);
      }

      const filters: Record<string, unknown> = {
        first: limit,
        includeArchived,
        teamId,
      };
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
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list projects: ${err.message || 'Unknown error'}`,
      );
    }
  },
});