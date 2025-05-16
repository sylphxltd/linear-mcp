import type { LinearClient, Project, ProjectMilestone } from '@linear/sdk';
import type { z } from 'zod';
import {
  ListProjectMilestonesInputSchema,
  CreateProjectMilestoneInputSchema,
  UpdateProjectMilestoneInputSchema,
  DeleteProjectMilestoneInputSchema,
} from '../schemas/index.js';
import { defineTool } from '../schemas/index.js';
import { getLinearClient } from '../utils/linear-client.js';

export const listProjectMilestonesTool = defineTool({
  name: 'list_project_milestones',
  description: 'Lists all milestones for a given project.',
  inputSchema: ListProjectMilestonesInputSchema.shape,
  handler: async (args: z.infer<typeof ListProjectMilestonesInputSchema>) => {
    const linear = getLinearClient();
    try {
      const project = await linear.project(args.projectId);
      if (!project) {
        throw new Error(`Project with ID "${args.projectId}" not found.`);
      }
      // Using the hint: project.milestones()
      // TS Error: Property 'milestones' does not exist on type 'Project'.
      const milestonesResult = await project.projectMilestones();
      let resultNodes: ProjectMilestone[] = [];
      if (milestonesResult && Array.isArray(milestonesResult.nodes)) {
        resultNodes = milestonesResult.nodes;
      } else if (Array.isArray(milestonesResult)) {
        resultNodes = milestonesResult as ProjectMilestone[];
      } else {
        throw new Error('Could not retrieve milestones. The structure returned by project.milestones() was not as expected or the method is unavailable.');
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(resultNodes) }],
      };
    } catch (error: unknown) {
      console.error('Failed to list project milestones:', error);
      if (error instanceof Error) {
        // Propagate the error message in a way the MCP server can handle
        return { content: [{type: 'text', text: `Error: ${error.message}`}], isError: true };
      }
      return { content: [{type: 'text', text: 'Error: Failed to list project milestones due to an unknown error.'}], isError: true };
    }
  },
});

export const createProjectMilestoneTool = defineTool({
  name: 'create_project_milestone',
  description: 'Creates a new milestone within a project.',
  inputSchema: CreateProjectMilestoneInputSchema.shape,
  handler: async (args: z.infer<typeof CreateProjectMilestoneInputSchema>) => {
    const linear = getLinearClient();
    try {
      const payload: {
        projectId: string;
        name: string;
        description?: string;
        targetDate?: Date;
      } = {
        projectId: args.projectId,
        name: args.name,
      };
      if (args.description) payload.description = args.description;
      if (args.targetDate) payload.targetDate = new Date(args.targetDate);

      // Using the hint: linear.projectMilestoneCreate
      // TS Error: Property 'projectMilestoneCreate' does not exist on type 'LinearClient'.
      const milestoneCreatePayload = await linear.createProjectMilestone(payload);
      if (!milestoneCreatePayload.success || !milestoneCreatePayload.projectMilestone) {
        const entity = await milestoneCreatePayload.projectMilestone;
        if (!entity) {
          throw new Error('Failed to create project milestone in Linear: No entity returned and no specific error message from SDK.');
        }
        throw new Error('Failed to create project milestone in Linear: Operation reported as not successful by SDK.');
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(milestoneCreatePayload.projectMilestone) }],
      };
    } catch (error: unknown) {
      console.error('Failed to create project milestone:', error);
      if (error instanceof Error) {
        return { content: [{type: 'text', text: `Error: ${error.message}`}], isError: true };
      }
      return { content: [{type: 'text', text: 'Error: Failed to create project milestone due to an unknown error.'}], isError: true };
    }
  },
});

export const updateProjectMilestoneTool = defineTool({
  name: 'update_project_milestone',
  description: 'Updates an existing milestone.',
  inputSchema: UpdateProjectMilestoneInputSchema.shape,
  handler: async (args: z.infer<typeof UpdateProjectMilestoneInputSchema>) => {
    const linear = getLinearClient();
    try {
      const { milestoneId, ...updateData } = args;
      const payload: { name?: string; description?: string; targetDate?: Date } = {};
      if (updateData.name) payload.name = updateData.name;
      if (updateData.description) payload.description = updateData.description;
      if (updateData.targetDate) payload.targetDate = new Date(updateData.targetDate);

      if (Object.keys(payload).length === 0) {
        throw new Error('No update data provided for project milestone.');
      }

      // Using the hint: linear.projectMilestoneUpdate
      // TS Error: Property 'projectMilestoneUpdate' does not exist on type 'LinearClient'.
      const milestoneUpdatePayload = await linear.updateProjectMilestone(milestoneId, payload);
      if (!milestoneUpdatePayload.success || !milestoneUpdatePayload.projectMilestone) {
        throw new Error(`Failed to update project milestone "${milestoneId}" in Linear: Operation reported as not successful by SDK.`);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(milestoneUpdatePayload.projectMilestone) }],
      };
    } catch (error: unknown) {
      console.error('Failed to update project milestone:', error);
      if (error instanceof Error) {
        return { content: [{type: 'text', text: `Error: ${error.message}`}], isError: true };
      }
      return { content: [{type: 'text', text: 'Error: Failed to update project milestone due to an unknown error.'}], isError: true };
    }
  },
});

export const deleteProjectMilestoneTool = defineTool({
  name: 'delete_project_milestone',
  description: 'Deletes a milestone.',
  inputSchema: DeleteProjectMilestoneInputSchema.shape,
  handler: async (args: z.infer<typeof DeleteProjectMilestoneInputSchema>) => {
    const linear = getLinearClient();
    try {
      // Using the hint: linear.projectMilestoneDelete
      // TS Error: Property 'projectMilestoneDelete' does not exist on type 'LinearClient'.
      const deletePayload = await linear.deleteProjectMilestone(args.milestoneId);
      if (!deletePayload.success) {
        throw new Error(`Failed to delete project milestone "${args.milestoneId}" in Linear: Operation reported as not successful by SDK.`);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Project milestone "${args.milestoneId}" deleted successfully.` }) }],
      };
    } catch (error: unknown) {
      console.error('Failed to delete project milestone:', error);
      if (error instanceof Error) {
        return { content: [{type: 'text', text: `Error: ${error.message}`}], isError: true };
      }
      return { content: [{type: 'text', text: 'Error: Failed to delete project milestone due to an unknown error.'}], isError: true };
    }
  },
});

export const projectMilestoneTools = {
  listProjectMilestonesTool,
  createProjectMilestoneTool,
  updateProjectMilestoneTool,
  deleteProjectMilestoneTool,
};