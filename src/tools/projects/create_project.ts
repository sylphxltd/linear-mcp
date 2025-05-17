import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableTeamsJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { ProjectCreateSchema } from './shared.js';
import type { ProjectInput } from './shared.js';

export const createProjectTool = defineTool({
  name: 'create_project',
  description: 'Create a new project in Linear',
  inputSchema: ProjectCreateSchema,
  handler: async ({ name, description, content, startDate, targetDate, teamIds }) => {
    const linearClient = getLinearClient();
    try {
      const projectInput: ProjectInput = {
        name,
        teamIds,
        description,
        content,
        startDate,
        targetDate,
      };
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
      if (error instanceof McpError) throw error;
      const err = error as Error;
      if (isEntityError(err.message)) {
        let availableEntitiesJson = '[]';
        // For createProject, the primary entity error would be related to teamIds
        if (err.message.toLowerCase().includes('team')) {
          availableEntitiesJson = await getAvailableTeamsJson(linearClient);
        }
        throw new Error(`${err.message}\nAvailable: ${availableEntitiesJson}`);
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create project: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
