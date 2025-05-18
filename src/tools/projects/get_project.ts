import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapProjectToOutput, getAvailableProjectsMessage } from './shared.js';

const ProjectGetSchema = {
  projectId: z.string().uuid().optional().describe('Project UUID'),
  projectName: z.string().optional().describe('Project name (case insensitive)'),
};

type ProjectInput = {
  projectId?: string;
  projectName?: string;
};

export const getProjectTool = defineTool({
  name: 'get_project',
  description: 'Retrieve details of a specific project in Linear',
  inputSchema: ProjectGetSchema,
  handler: async ({ projectId, projectName }: ProjectInput) => {
    const linearClient = getLinearClient();

    try {
      if (!projectId && !projectName) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Must provide either projectId or projectName',
        );
      }

      let project = null;

      // Try to find by ID first
      if (projectId) {
        project = await linearClient.project(projectId);
        if (project) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(mapProjectToOutput(project)),
              },
            ],
          };
        }
      }

      // Try to find by name
      if (projectName) {
        const projects = await linearClient.projects({
          filter: { name: { eqIgnoreCase: projectName } },
        });

        if (projects.nodes.length > 1) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Multiple projects found with this name. Please use project ID.',
          );
        }

        if (projects.nodes.length === 1) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(mapProjectToOutput(projects.nodes[0])),
              },
            ],
          };
        }
      }

      // No project found - get available projects for error message
      const availableProjectsMessage = await getAvailableProjectsMessage(linearClient);
      const searchTerm = projectId || projectName;
      throw new McpError(
        ErrorCode.InvalidParams,
        `Project not found with ${projectId ? 'ID' : 'name'} "${searchTerm}".${availableProjectsMessage}`,
      );
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get project: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  },
});
