import type { LinearClient } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
// IssueUpdateSchema is now defined locally
const IssueUpdateSchema = {
  id: z.string().describe('The UUID of the issue to update'),
  title: z.string().optional().describe('The title of the issue'),
  description: z.string().optional().describe('The description of the issue in Markdown'),
  priority: z.number().optional().describe('The priority of the issue. 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low.'),
  teamId: z.string().optional().describe('The identifier of the team associated with the issue'),
  assigneeId: z.string().optional().describe('The UUID of the assignee to assign the issue to'),
  projectId: z.string().optional().describe('The UUID of the project to add the issue to'),
  projectMilestoneId: z.string().uuid('Invalid project milestone ID').nullable().optional().describe('The UUID of the project milestone to associate the issue with (null to remove)'),
  stateId: z.string().optional().describe('The UUID of the workflow state to set for the issue'),
  labelIds: z.array(z.string()).optional().describe('Array of label UUIDs to set on the issue'),
  parentId: z.string().optional().describe('The identifier of the parent issue'),
  subscriberIds: z.array(z.string()).optional().describe('The identifiers of the users subscribing to this ticket'),
  estimate: z.number().optional().describe('The estimated complexity of the issue'),
  dueDate: z.string().optional().describe('The due date for the issue in ISO format'),
  cycleId: z.string().optional().describe('The cycle associated with the issue'),
};
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
