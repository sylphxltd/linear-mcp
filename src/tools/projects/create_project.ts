import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { ProjectCreateSchema } from './shared.js';
import type { ProjectInput } from './shared.js';

export const createProjectTool = defineTool({
  name: 'create_project',
  description: 'Create a new project in Linear',
  inputSchema: ProjectCreateSchema,
  handler: async (args) => {
    try {
      const { name, description, content, startDate, targetDate, teamIds } = args;
      const projectInput: ProjectInput = {
        name,
        teamIds,
        description,
        content,
        startDate,
        targetDate,
      };
      const linearClient = getLinearClient();
      const projectPayload = await linearClient.createProject(projectInput);
      if (projectPayload.project) {
        const project = await projectPayload.project;
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
      throw new McpError(ErrorCode.InternalError, 'Failed to create project: No project returned');
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create project: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
