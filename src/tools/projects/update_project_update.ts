import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';

const UpdateProjectUpdateSchema = {
  updateId: z.string().describe('The ID of the project update to modify'),
  body: z.string().optional().describe('The updated content in markdown format'),
  isDiffHidden: z.boolean().optional().describe('Whether to hide the diff from previous update'),
};

export const updateProjectUpdateTool = defineTool({
  name: 'update_project_update',
  description: 'Update an existing project update',
  inputSchema: UpdateProjectUpdateSchema,
  handler: async ({ updateId, body, isDiffHidden }) => {
    try {
      const linearClient = getLinearClient();
      
      // Verify the update exists first
      const existingUpdate = await linearClient.projectUpdate(updateId);
      if (!existingUpdate) {
        throw new McpError(ErrorCode.InvalidParams, `Project update with ID '${updateId}' not found.`);
      }

      // Build the update payload with only provided fields
      const updatePayload: any = {};
      if (body !== undefined) updatePayload.body = body;
      if (isDiffHidden !== undefined) updatePayload.isDiffHidden = isDiffHidden;

      if (Object.keys(updatePayload).length === 0) {
        throw new McpError(ErrorCode.InvalidParams, 'At least one field (body or isDiffHidden) must be provided for update.');
      }

      // Update the project update
      const updateResult = await linearClient.updateProjectUpdate(updateId, updatePayload);
      
      const updatedUpdate = await updateResult.projectUpdate;
      if (!updatedUpdate) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to update project update or retrieve details. Sync ID: ${updateResult.lastSyncId}`
        );
      }

      // Return detailed information about the updated update
      const updateDetails = {
        id: updatedUpdate.id,
        body: updatedUpdate.body,
        projectId: updatedUpdate.projectId,
        userId: updatedUpdate.userId,
        createdAt: updatedUpdate.createdAt.toISOString(),
        editedAt: updatedUpdate.editedAt?.toISOString() || null,
        isStale: updatedUpdate.isStale,
        isDiffHidden: updatedUpdate.isDiffHidden,
        diff: updatedUpdate.diff,
        diffMarkdown: updatedUpdate.diffMarkdown,
        url: updatedUpdate.url,
      };

      // Get project info for context
      const project = await updatedUpdate.project;
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            success: true,
            projectUpdate: updateDetails,
            projectName: project?.name || 'Unknown',
            projectState: project?.state || 'Unknown',
            changedFields: Object.keys(updatePayload),
            syncId: updateResult.lastSyncId
          })
        }] 
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update project update: ${(error as Error).message || 'Unknown error'}`
      );
    }
  },
}); 