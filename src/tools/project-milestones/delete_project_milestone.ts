import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { isEntityError } from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { DeleteProjectMilestoneInputSchema } from './shared.js';

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
          // If fetching the milestone also fails, it strongly suggests it doesn't exist.
          // Construct a message that isEntityError might catch.
          const notFoundMsg = `Entity not found: ProjectMilestone - Could not find referenced ProjectMilestone with ID ${milestoneId}`;
          if (isEntityError(notFoundMsg)) {
            throw new Error(notFoundMsg);
          }
          throw new McpError(
            ErrorCode.InvalidParams, // Or a more specific "NotFound" if available and appropriate
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
      if (error instanceof McpError) throw error; // Re-throw existing McpErrors

      const err = error as Error;
      if (isEntityError(err.message)) {
        // If it's a known entity error (e.g., "Milestone not found"),
        // re-throw it as a standard Error.
        throw new Error(err.message);
      }

      // Fallback for other errors
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete project milestone "${milestoneId}": ${err.message || 'Unknown error'}`,
      );
    }
  },
});
