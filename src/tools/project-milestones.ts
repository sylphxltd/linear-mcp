import type { LinearClient, Project, ProjectMilestone } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import {
  CreateProjectMilestoneInputSchema,
  DeleteProjectMilestoneInputSchema,
  ListProjectMilestonesInputSchema,
  UpdateProjectMilestoneInputSchema,
  defineTool, // Ensure defineTool is imported
} from '../schemas/index.js';
import { getLinearClient } from '../utils/linear-client.js';

// Helper function to get available projects for error messages
async function getAvailableProjectsJsonForError(linearClient: LinearClient): Promise<string> {
  try {
    const projects = await linearClient.projects();
    if (!projects.nodes || projects.nodes.length === 0) {
      return '[]';
    }
    const projectList = projects.nodes.map((p) => ({ id: p.id, name: p.name }));
    return JSON.stringify(projectList, null, 2);
  } catch (e) {
    const error = e as Error;
    return `(Could not fetch available projects for context: ${error.message})`;
  }
}

export const listProjectMilestonesTool = defineTool({
  name: 'list_project_milestones',
  description: 'Lists all milestones for a given project.',
  inputSchema: ListProjectMilestonesInputSchema.shape,
  handler: async ({ projectId }) => {
    const linear = getLinearClient();
    try {
      const project = await linear.project(projectId);
      if (!project) {
        const availableProjectsJson = await getAvailableProjectsJsonForError(linear);
        throw new McpError(
          ErrorCode.InvalidParams,
          `Project with ID "${projectId}" not found. Valid projects are: ${availableProjectsJson}`,
        );
      }
      const milestonesResult = await project.projectMilestones();
      let resultNodes: ProjectMilestone[] = [];

      if (milestonesResult && Array.isArray(milestonesResult.nodes)) {
        resultNodes = milestonesResult.nodes;
      } else if (
        milestonesResult &&
        typeof milestonesResult === 'object' &&
        milestonesResult !== null &&
        'nodes' in milestonesResult &&
        Array.isArray((milestonesResult as { nodes?: ProjectMilestone[] }).nodes)
      ) {
        resultNodes = (milestonesResult as { nodes: ProjectMilestone[] }).nodes;
      } else if (Array.isArray(milestonesResult)) {
        resultNodes = milestonesResult as ProjectMilestone[];
      } else if (project.name) {
        // Project exists but milestonesResult is not in expected format or empty
        // This implies no milestones or an unexpected SDK response for milestones
      } else {
        throw new McpError(
          ErrorCode.InternalError,
          'Could not retrieve milestones. Project data was inconsistent after initial fetch.',
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              resultNodes.map((m) => ({
                id: m.id,
                name: m.name,
                description: m.description,
                targetDate: m.targetDate,
                sortOrder: m.sortOrder,
                projectId: m.projectId,
              })),
            ),
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
          `Project with ID "${projectId}" not found when listing milestones. Valid projects are: ${availableProjectsJson}`,
        );
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list project milestones: ${err.message || 'Unknown error'}`,
      );
    }
  },
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
        // Changed to McpError
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
          // Cannot list all milestones easily without project context.
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

export const projectMilestoneTools = {
  listProjectMilestonesTool,
  createProjectMilestoneTool,
  updateProjectMilestoneTool,
  deleteProjectMilestoneTool,
};
