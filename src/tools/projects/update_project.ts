import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { ProjectUpdateSchema } from './shared.js';
import type { ProjectUpdateInput } from './shared.js';

export const updateProjectTool = defineTool({
  name: 'update_project',
  description: 'Update an existing Linear project',
  inputSchema: ProjectUpdateSchema,
  handler: async ({ id, name, description, content, startDate, targetDate, teamIds }) => {
    try {
      const linearClient = getLinearClient();

      const projectInput: ProjectUpdateInput & { teamIds?: string[] } = {
        name,
        description,
        content,
        startDate,
        targetDate,
      };

      if (teamIds !== undefined) {
        projectInput.teamIds = teamIds;
      }

      const projectPayload = await linearClient.updateProject(id, projectInput);
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
      throw new McpError(ErrorCode.InternalError, 'Failed to update project: No project returned');
    } catch (error: unknown) {
      if (error instanceof McpError) {
        throw error;
      }
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update project: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
