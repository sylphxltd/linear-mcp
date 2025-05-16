import { ProjectQuerySchema, defineTool } from '../../schemas/index.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getAvailableProjectsJson } from './shared.js';

export const getProjectTool = defineTool({
  name: 'get_project',
  description: 'Retrieve details of a specific project in Linear',
  inputSchema: ProjectQuerySchema,
  handler: async ({ query }) => {
    const linearClient = getLinearClient();
    try {
      const projectFetch = await linearClient.project(query);
      if (projectFetch) {
        const project = await projectFetch;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
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
              }),
            },
          ],
        };
      }
    } catch (_error: unknown) {
      // continue to search by name
    }
    try {
      const projectsConnection = await linearClient.projects({
        filter: {
          name: { eq: query },
        },
      });
      if (projectsConnection.nodes.length > 0) {
        const project = await projectsConnection.nodes[0];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
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
              }),
            },
          ],
        };
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get project: ${err.message || 'Unknown error'}`,
      );
    }
    // If project not found by ID or name, fetch all projects and include in error message
    try {
      const allProjects = await linearClient.projects();
      const validProjects = allProjects.nodes.map((p) => ({
        id: p.id,
        name: p.name,
      }));
      throw new McpError(
        ErrorCode.InvalidParams,
        `Project with query "${query}" not found. Valid projects are: ${JSON.stringify(validProjects, null, 2)}`,
      );
    } catch (listError: unknown) {
      const err = listError as { message?: string };
      throw new McpError(
        ErrorCode.InvalidParams,
        `Project with query "${query}" not found. Also failed to list available projects: ${err.message || 'Unknown error'}`,
      );
    }
  },
});