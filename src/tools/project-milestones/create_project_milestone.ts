import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableProjectsJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { CreateProjectMilestoneInputSchema } from './shared.js';

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
      // Pre-fetching project to ensure it exists before creating milestone.
      // The createProjectMilestone SDK call itself might not give a specific "project not found"
      // if projectId is simply invalid for the milestone creation.
      const project = await linear.project(projectId);
      if (!project) {
        const availableProjectsJson = await getAvailableProjectsJson(linear);
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
            text: JSON.stringify({
              id: createdMilestone.id,
              name: createdMilestone.name,
              description: createdMilestone.description,
              targetDate: createdMilestone.targetDate,
              sortOrder: createdMilestone.sortOrder,
              projectId: createdMilestone.projectId,
            }),
          },
        ],
      };
    } catch (error: unknown) {
      if (error instanceof McpError) throw error; // Re-throw existing McpErrors

      const err = error as Error;
      if (isEntityError(err.message)) {
        let availableEntitiesJson = '[]';
        // Primarily, errors here would be due to projectId
        if (err.message.toLowerCase().includes('project')) {
          availableEntitiesJson = await getAvailableProjectsJson(linear);
        }
        throw new Error(`${err.message}\nAvailable: ${availableEntitiesJson}`);
      }

      // Fallback for other errors
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create project milestone for project ID "${projectId}": ${err.message || 'Unknown error'}`,
      );
    }
  },
});
