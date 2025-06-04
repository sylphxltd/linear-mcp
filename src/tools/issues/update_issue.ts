import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapIssueToDetails } from './shared.js';

// Keep only the most commonly used fields
const IssueUpdateSchema = {
  // Required field
  id: z.string().describe('Issue ID to update'),
  
  // Optional fields (same as create, except teamId which can't be changed)
  title: z.string().optional().describe('New title'),
  description: z.string().optional().describe('New description in markdown'),
  priority: z.number().optional().describe('Priority (0=None, 1=Urgent, 2=High, 3=Normal, 4=Low)'),
  assigneeId: z.string().optional().describe('Assignee user ID'),
  labelIds: z.array(z.string()).optional().describe('Label IDs'),
  stateId: z.string().optional().describe('Workflow state ID'),
  projectId: z.string().optional().describe('Project ID to assign the issue to'),
  projectMilestoneId: z.string().optional().describe('Project milestone ID to assign the issue to'),
};

export const updateIssueTool = defineTool({
  name: 'update_issue',
  description: 'Update an existing Linear issue',
  inputSchema: IssueUpdateSchema,
  handler: async ({ id, title, description, priority, assigneeId, labelIds, stateId, projectId, projectMilestoneId }) => {
    const linearClient = getLinearClient();

    // Get the issue to update
    const issueToUpdate = await linearClient.issue(id);
    if (!issueToUpdate) {
      throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${id}' not found.`);
    }

    // Build update payload with only defined fields
    const updatePayload = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(priority !== undefined && { priority }),
      ...(assigneeId !== undefined && { assigneeId }),
      ...(labelIds !== undefined && { labelIds }),
      ...(stateId !== undefined && { stateId }),
      ...(projectId !== undefined && { projectId }),
      ...(projectMilestoneId !== undefined && { projectMilestoneId }),
    };

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
