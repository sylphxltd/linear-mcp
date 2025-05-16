import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { UpdateProjectMilestoneInputSchema } from './shared.js';

export const updateProjectMilestoneTool = defineTool({
  name: 'update_project_milestone',
  description: 'Updates an existing milestone.',
  inputSchema: UpdateProjectMilestoneInputSchema.shape,
  handler: async ({
    milestoneId,
    name,
    description,
    targetDate,
  }: z.infer<typeof UpdateProjectMilestoneInputSchema>) => {
    const linear = getLinearClient();
    try {
      const payload: {
        name?: string;
        description?: string;
        targetDate?: Date;
      } = {};
      if (name) payload.name = name;
      if (description) payload.description = description;
      if (targetDate) payload.targetDate = new Date(targetDate);

      if (Object.keys(payload).length === 0) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'No update data provided for project milestone.',
        );
      }

      const milestoneUpdatePayload = await linear.updateProjectMilestone(milestoneId, payload);
      const updatedMilestone = await milestoneUpdatePayload.projectMilestone;

      if (!milestoneUpdatePayload.success || !updatedMilestone) {
        try {
          await linear.projectMilestone(milestoneId);
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to update project milestone "${milestoneId}" in Linear. Success: ${milestoneUpdatePayload.success}, Last Sync ID: ${milestoneUpdatePayload.lastSyncId}`,
          );
        } catch (_fetchError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Project milestone with ID "${milestoneId}" not found or update failed. Please verify the milestone ID.`,
          );
        }
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: updatedMilestone.id,
              name: updatedMilestone.name,
              description: updatedMilestone.description,
              targetDate: updatedMilestone.targetDate,
              sortOrder: updatedMilestone.sortOrder,
              projectId: updatedMilestone.projectId,
            }),
          },
        ],
      };
    } catch (error: unknown) {
      if (error instanceof McpError) throw error;
      const err = error as Error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update project milestone: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
