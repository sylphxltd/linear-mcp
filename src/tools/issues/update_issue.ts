import type { LinearClient } from '@linear/sdk';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueUpdateSchema } from './shared.js';
import {
  mapIssueToDetails,
  validateAssignee,
  validateIssueExists,
  validateLabels,
  validateProject,
  validateProjectMilestone,
  validateState,
} from './shared.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export const updateIssueTool = defineTool({
  name: 'update_issue',
  description: 'Update an existing Linear issue',
  inputSchema: IssueUpdateSchema,
  handler: async ({
    id,
    title,
    description,
    priority,
    projectId,
    stateId,
    assigneeId,
    labelIds,
    dueDate,
    projectMilestoneId
  }) => {
    const linearClient = getLinearClient();
    
    // Validate the issue exists and get current values
    const issueToUpdate = await validateIssueExists(linearClient, id, 'updating issue');
    const currentTeamId = (await issueToUpdate.team)?.id;
    const currentProjectId = (await issueToUpdate.project)?.id;

    // Validate input parameters
    await validateInputParameters({
      linearClient,
      id,
      currentTeamId,
      currentProjectId,
      projectId,
      stateId,
      assigneeId,
      labelIds,
      projectMilestoneId
    });

    // Construct update payload with only defined fields
    const updatePayload = buildUpdatePayload({
      title,
      description,
      priority,
      projectId,
      stateId,
      assigneeId,
      labelIds,
      dueDate,
      projectMilestoneId
    });

    // Update the issue
    try {
      const issueUpdate = await linearClient.updateIssue(id, updatePayload);
      const updatedIssue = await issueUpdate.issue;
      
      if (!updatedIssue) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to update issue or retrieve details. Sync ID: ${issueUpdate.lastSyncId}`
        );
      }
      
      const detailedUpdatedIssue = await mapIssueToDetails(updatedIssue, false);
      return { content: [{ type: 'text', text: JSON.stringify(detailedUpdatedIssue) }] };
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error updating issue: ${(error as Error).message}`
      );
    }
  },
});

/**
 * Input parameters for validation
 */
interface ValidationParams {
  linearClient: LinearClient;
  id: string;
  currentTeamId?: string;
  currentProjectId?: string;
  projectId?: string;
  stateId?: string;
  assigneeId?: string;
  labelIds?: string[];
  projectMilestoneId?: string | null;
}

/**
 * Input parameters for building update payload
 */
interface UpdatePayloadParams {
  title?: string;
  description?: string;
  priority?: number;
  projectId?: string;
  stateId?: string;
  assigneeId?: string;
  labelIds?: string[];
  dueDate?: string;
  projectMilestoneId?: string | null;
}

/**
 * Validates all input parameters for updating an issue
 */
async function validateInputParameters({
  linearClient,
  id,
  currentTeamId,
  currentProjectId,
  projectId,
  stateId,
  assigneeId,
  labelIds,
  projectMilestoneId
}: ValidationParams): Promise<void> {
  // Validate project if provided
  if (projectId) {
    await validateProject(linearClient, projectId, 'updating issue');
  }

  // Validate state if provided
  if (stateId) {
    if (!currentTeamId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Issue '${id}' has no team, cannot validate stateId.`
      );
    }
    await validateState(linearClient, currentTeamId, stateId, 'updating issue');
  }

  // Validate assignee if provided
  if (assigneeId) {
    await validateAssignee(linearClient, assigneeId, 'updating issue');
  }

  // Validate labels if provided
  if (labelIds && labelIds.length > 0) {
    if (!currentTeamId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Issue '${id}' has no team, cannot validate labelIds.`
      );
    }
    await validateLabels(linearClient, currentTeamId, labelIds, 'updating issue');
  }

  // Validate project milestone if provided or explicitly set to null
  if (projectMilestoneId !== undefined) {
    if (projectMilestoneId) {
      const targetProjectId = projectId ?? currentProjectId;
      await validateProjectMilestone(
        linearClient,
        projectMilestoneId,
        targetProjectId,
        'updating issue'
      );
    }
    // If projectMilestoneId is null, it's valid (removing the milestone)
  }
}

/**
 * Builds the update payload with only defined fields
 */
function buildUpdatePayload({
  title,
  description,
  priority,
  projectId,
  stateId,
  assigneeId,
  labelIds,
  dueDate,
  projectMilestoneId
}: UpdatePayloadParams): Record<string, unknown> {
  return {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(priority !== undefined && { priority }),
    ...(projectId !== undefined && { projectId }),
    ...(stateId !== undefined && { stateId }),
    ...(assigneeId !== undefined && { assigneeId }),
    ...(labelIds !== undefined && { labelIds }),
    ...(dueDate !== undefined && { dueDate }),
    ...(projectMilestoneId !== undefined && { projectMilestoneId }),
  };
}
