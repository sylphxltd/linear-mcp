import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { mapMilestoneToOutput, getAvailableProjectsJsonForError } from './shared.js';

const CreateProjectMilestoneInputSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  name: z.string().min(1, 'Milestone name cannot be empty'),
  description: z.string().optional(),
  targetDate: z.string().datetime({ message: 'Invalid ISO date string for targetDate' }).optional(),
});

export const createProjectMilestoneTool = defineTool({
  name: 'create_project_milestone',
  description: 'Creates a new milestone within a project.',
  inputSchema: CreateProjectMilestoneInputSchema.shape,
  handler: async ({
    projectId,
    name,
    description,
    targetDate,
  }: z.infer<typeof CreateProjectMilestoneInputSchema>) => {
    const linear = getLinearClient();
    try {
      const project = await linear.project(projectId);
      if (!project) {
        const availableProjectsJson = await getAvailableProjectsJsonForError(linear);
        throw new McpError(
          ErrorCode.InvalidParams,
          `Project with ID "${projectId}" not found. Cannot create milestone. Valid projects are: ${availableProjectsJson}`,
        );
      }

      const payload: {
        projectId: string;
        name: string;
        description?: string;
        targetDate?: Date;
      } = {
        projectId,
        name,
      };
      if (description) payload.description = description;
      if (targetDate) payload.targetDate = new Date(targetDate);

      const milestoneCreatePayload = await linear.createProjectMilestone(payload);
      const createdMilestone = await milestoneCreatePayload.projectMilestone;

      if (!milestoneCreatePayload.success || !createdMilestone) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create project milestone in Linear. Success: ${milestoneCreatePayload.success}, Last Sync ID: ${milestoneCreatePayload.lastSyncId}`,
        );
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(mapMilestoneToOutput(createdMilestone)),
          },
        ],
      };
    } catch (error: unknown) {
      if (error instanceof McpError) throw error;
      const err = error as Error;
      if (
        err.message.toLowerCase().includes('not found') &&
        err.message.toLowerCase().includes(projectId.toLowerCase())
      ) {
        const availableProjectsJson = await getAvailableProjectsJsonForError(linear);
        throw new McpError(
          ErrorCode.InvalidParams,
          `Project with ID "${projectId}" not found when creating milestone. Valid projects are: ${availableProjectsJson}`,
        );
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create project milestone: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
