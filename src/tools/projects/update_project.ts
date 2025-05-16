import { ProjectUpdateSchema, defineTool } from '../../schemas/index.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectUpdateInput } from './shared.js';
import { validateProjectUpdateArgsOrThrow } from './shared.js';

export const updateProjectTool = defineTool({
  name: 'update_project',
  description: 'Update an existing Linear project',
  inputSchema: ProjectUpdateSchema,
  handler: async (args) => {
    try {
      const { id, name, description, content, startDate, targetDate, teamIds } = args;
      const linearClient = getLinearClient();

      await validateProjectUpdateArgsOrThrow(linearClient, id, teamIds);

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