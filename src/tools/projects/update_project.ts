import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableProjectsJson,
  getAvailableTeamsJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { ProjectUpdateSchema } from './shared.js';
import type { ProjectUpdateInput } from './shared.js';

export const updateProjectTool = defineTool({
  name: 'update_project',
  description: 'Update an existing Linear project',
  inputSchema: ProjectUpdateSchema,
  handler: async ({ id, name, description, content, startDate, targetDate, teamIds }) => {
    const linearClient = getLinearClient();
    try {
      // Validation is removed, SDK call will throw if IDs are invalid.
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
      if (error instanceof McpError) throw error;

      const err = error as Error;
      if (isEntityError(err.message)) {
        let availableEntitiesJson = '[]';
        const msgLower = err.message.toLowerCase();

        if (msgLower.includes('project') || msgLower.includes(id.toLowerCase())) {
          availableEntitiesJson = await getAvailableProjectsJson(linearClient);
        } else if (msgLower.includes('team')) {
          availableEntitiesJson = await getAvailableTeamsJson(linearClient);
        }
        throw new Error(`${err.message}\nAvailable: ${availableEntitiesJson}`);
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update project '${id}': ${err.message || 'Unknown error'}`,
      );
    }
  },
});
