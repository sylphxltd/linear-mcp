import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapProjectToOutput, getAvailableProjectsMessage } from './shared.js';

const ProjectUpdateSchema = {
  // Required
  id: z.string().uuid().describe('Project UUID'),
  
  // Basic information
  name: z.string().min(1).optional().describe('New project name'),
  description: z.string().optional().describe('New description in markdown'),
  content: z.string().optional().describe('New content in markdown'),
  
  // Dates
  startDate: z.string().datetime().optional().describe('New start date (ISO format)'),
  targetDate: z.string().datetime().optional().describe('New target date (ISO format)'),
  
  // Teams
  teamIds: z.array(z.string().uuid()).optional().describe('Team UUIDs to associate with'),
};

export const updateProjectTool = defineTool({
  name: 'update_project',
  description: 'Update an existing Linear project',
  inputSchema: ProjectUpdateSchema,
  handler: async ({ id, ...updateFields }) => {
    const linearClient = getLinearClient();

    try {
      // Check if project exists
      const existingProject = await linearClient.project(id);
      if (!existingProject) {
        const availableProjectsMessage = await getAvailableProjectsMessage(linearClient);
        throw new McpError(
          ErrorCode.InvalidParams,
          `Project with ID "${id}" not found.${availableProjectsMessage}`,
        );
      }

      // Validate that at least one field is being updated
      if (Object.keys(updateFields).length === 0) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Must provide at least one field to update',
        );
      }

      // Update the project
      const projectPayload = await linearClient.updateProject(id, updateFields);
      const updatedProject = await projectPayload.project;

      if (!updatedProject) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to update project: No project returned. Sync ID: ${projectPayload.lastSyncId}`,
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(mapProjectToOutput(updatedProject)),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update project: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  },
});
