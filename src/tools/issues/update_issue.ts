import type { LinearClient } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueUpdateSchema } from './shared.js';
import { mapIssueToDetails } from './shared.js';

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
    projectMilestoneId,
  }) => {
    const linearClient = getLinearClient();

    // Get the issue to update
    const issueToUpdate = await linearClient.issue(id);
    if (!issueToUpdate) {
      throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${id}' not found.`);
    }

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
      projectMilestoneId,
    });

    // Update the issue
    try {
      const issueUpdate = await linearClient.updateIssue(id, updatePayload);
      const updatedIssue = await issueUpdate.issue;

      if (!updatedIssue) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to update issue or retrieve details. Sync ID: ${issueUpdate.lastSyncId}`,
        );
      }

      const detailedUpdatedIssue = await mapIssueToDetails(updatedIssue, false);
      return { content: [{ type: 'text', text: JSON.stringify(detailedUpdatedIssue) }] };
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error updating issue: ${(error as Error).message}`,
      );
    }
  },
});

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
  projectMilestoneId,
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
