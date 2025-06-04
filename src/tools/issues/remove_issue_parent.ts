import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapIssueToDetails } from './shared.js';

const RemoveIssueParentSchema = {
  issueId: z.string().describe('The ID of the sub-issue to convert back to a regular issue'),
};

export const removeIssueParentTool = defineTool({
  name: 'remove_issue_parent',
  description: 'Remove the parent from a sub-issue, converting it back to a regular issue',
  inputSchema: RemoveIssueParentSchema,
  handler: async ({ issueId }) => {
    try {
      const linearClient = getLinearClient();
      
      // Get the issue to verify it exists
      const issue = await linearClient.issue(issueId);
      if (!issue) {
        throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${issueId}' not found.`);
      }

      // Check if issue has a parent
      const currentParent = await issue.parent;
      if (!currentParent) {
        throw new McpError(
          ErrorCode.InvalidParams, 
          `Issue '${issue.identifier}' is not a sub-issue (has no parent).`
        );
      }

      // Update the issue to remove the parent
      const issueUpdate = await linearClient.updateIssue(issueId, {
        parentId: null
      });
      
      const updatedIssue = await issueUpdate.issue;
      if (!updatedIssue) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to update issue or retrieve details. Sync ID: ${issueUpdate.lastSyncId}`
        );
      }

      // Return detailed information about the updated issue
      const detailedIssue = await mapIssueToDetails(updatedIssue, false, false);
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            success: true,
            issue: detailedIssue,
            removedParent: {
              id: currentParent.id,
              identifier: currentParent.identifier,
              title: currentParent.title
            },
            syncId: issueUpdate.lastSyncId
          })
        }] 
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to remove issue parent: ${(error as Error).message || 'Unknown error'}`
      );
    }
  },
}); 