import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';

const CreateProjectUpdateSchema = {
  projectId: z.string().describe('The ID of the project to create an update for'),
  body: z.string().describe('The update content in markdown format'),
  isDiffHidden: z.boolean().default(false).describe('Whether to hide the diff from previous update'),
};

export const createProjectUpdateTool = defineTool({
  name: 'create_project_update',
  description: 'Create a new project update',
  inputSchema: CreateProjectUpdateSchema,
  handler: async ({ projectId, body, isDiffHidden }) => {
    try {
      const linearClient = getLinearClient();
      
      // Verify the project exists first
      const project = await linearClient.project(projectId);
      if (!project) {
        throw new McpError(ErrorCode.InvalidParams, `Project with ID '${projectId}' not found.`);
      }

      // Create the project update
      const createPayload = await linearClient.createProjectUpdate({
        projectId,
        body,
        isDiffHidden,
      });
      
      const newUpdate = await createPayload.projectUpdate;
      if (!newUpdate) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create project update or retrieve details. Sync ID: ${createPayload.lastSyncId}`
        );
      }

      // Return detailed information about the created update
      const updateDetails = {
        id: newUpdate.id,
        body: newUpdate.body,
        projectId: newUpdate.projectId,
        userId: newUpdate.userId,
        createdAt: newUpdate.createdAt.toISOString(),
        editedAt: newUpdate.editedAt?.toISOString() || null,
        isStale: newUpdate.isStale,
        isDiffHidden: newUpdate.isDiffHidden,
        diff: newUpdate.diff,
        diffMarkdown: newUpdate.diffMarkdown,
        url: newUpdate.url,
      };
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            success: true,
            projectUpdate: updateDetails,
            projectName: project.name,
            projectState: project.state,
            syncId: createPayload.lastSyncId
          })
        }] 
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create project update: ${(error as Error).message || 'Unknown error'}`
      );
    }
  },
}); 