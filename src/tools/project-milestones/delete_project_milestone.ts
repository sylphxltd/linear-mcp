import { DeleteProjectMilestoneInputSchema, defineTool } from '../../schemas/index.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';

export const deleteProjectMilestoneTool = defineTool({
  name: 'delete_project_milestone',
  description: 'Deletes a milestone.',
  inputSchema: DeleteProjectMilestoneInputSchema.shape,
  handler: async ({ milestoneId }: z.infer<typeof DeleteProjectMilestoneInputSchema>) => {
    const linear = getLinearClient();
    try {
      const deletePayload = await linear.deleteProjectMilestone(milestoneId);
      if (!deletePayload.success) {
        try {
          await linear.projectMilestone(milestoneId);
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to delete project milestone "${milestoneId}" in Linear. Success: ${deletePayload.success}, Last Sync ID: ${deletePayload.lastSyncId}`,
          );
        } catch (_fetchError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Project milestone with ID "${milestoneId}" not found. Please verify the milestone ID.`,
          );
        }
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Project milestone "${milestoneId}" deleted successfully.`,
            }),
          },
        ],
      };
    } catch (error: unknown) {
      if (error instanceof McpError) throw error;
      const err = error as Error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete project milestone: ${err.message || 'Unknown error'}`,
      );
    }
  },
});