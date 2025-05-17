import type { ProjectMilestone } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableProjectsJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { ListProjectMilestonesInputSchema } from './shared.js';

export const listProjectMilestonesTool = defineTool({
  name: 'list_project_milestones',
  description: 'Lists all milestones for a given project.',
  inputSchema: ListProjectMilestonesInputSchema.shape,
  handler: async ({ projectId }) => {
    const linear = getLinearClient();
    try {
      const project = await linear.project(projectId);
      if (!project) {
        // This specific check might be redundant if linear.project(projectId) throws an error
        // that isEntityError can catch. However, keeping it for explicit "not found" before SDK call error.
        const availableProjectsJson = await getAvailableProjectsJson(linear);
        throw new McpError(
          ErrorCode.InvalidParams,
          `Project with ID "${projectId}" not found when listing milestones. Valid projects are: ${availableProjectsJson}`,
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
      if (error instanceof McpError) throw error; // Re-throw existing McpErrors

      const err = error as Error;
      if (isEntityError(err.message)) {
        let availableEntitiesJson = '[]';
        // Errors here are most likely due to an invalid projectId
        if (err.message.toLowerCase().includes('project')) {
          availableEntitiesJson = await getAvailableProjectsJson(linear);
        }
        throw new Error(`${err.message}\nAvailable: ${availableEntitiesJson}`);
      }

      // Fallback for other errors
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list project milestones for project ID "${projectId}": ${err.message || 'Unknown error'}`,
      );
    }
  },
});
