import type { ProjectMilestone } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
// --- Project Milestone schemas (localized) ---
export const ListProjectMilestonesInputSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});
// Helper function to get available projects for error messages
import type { LinearClient } from '@linear/sdk';
export async function getAvailableProjectsJsonForError(
  linearClient: LinearClient,
): Promise<string> {
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
