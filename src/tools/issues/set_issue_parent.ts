import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapIssueToDetails } from './shared.js';

const SetIssueParentSchema = {
  issueId: z.string().describe('The ID of the issue to convert to a sub-issue'),
  parentId: z.string().describe('The ID of the parent issue'),
  replaceExistingParent: z.boolean().default(false).describe('Whether to replace an existing parent if the issue already has one'),
};

export const setIssueParentTool = defineTool({
  name: 'set_issue_parent',
  description: 'Convert an existing issue into a sub-issue by setting its parent',
  inputSchema: SetIssueParentSchema,
  handler: async ({ issueId, parentId, replaceExistingParent }) => {
    try {
      const linearClient = getLinearClient();
      
      // Get both issues to verify they exist
      const [issue, parentIssue] = await Promise.all([
        linearClient.issue(issueId),
        linearClient.issue(parentId)
      ]);
      
      if (!issue) {
        throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${issueId}' not found.`);
      }
      
      if (!parentIssue) {
        throw new McpError(ErrorCode.InvalidParams, `Parent issue with ID '${parentId}' not found.`);
      }

      // Check if issue already has a parent
      const currentParent = await issue.parent;
      if (currentParent && !replaceExistingParent) {
        throw new McpError(
          ErrorCode.InvalidParams, 
          `Issue '${issue.identifier}' already has a parent issue '${currentParent.identifier}'. Set replaceExistingParent to true to replace it.`
        );
      }

      // Verify both issues are in the same team (Linear requirement)
      if (issue.teamId !== parentIssue.teamId) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Issue and parent must be in the same team. Issue is in team '${issue.teamId}', parent is in team '${parentIssue.teamId}'.`
        );
      }

      // Update the issue to set the parent
      const issueUpdate = await linearClient.updateIssue(issueId, {
        parentId: parentId
      });
      
      const updatedIssue = await issueUpdate.issue;
      if (!updatedIssue) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to update issue or retrieve details. Sync ID: ${issueUpdate.lastSyncId}`
        );
      }

      // Return detailed information about the updated sub-issue
      const detailedSubIssue = await mapIssueToDetails(updatedIssue, false, false);
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            success: true,
            subIssue: detailedSubIssue,
            parentId,
            parentTitle: parentIssue.title,
            parentIdentifier: parentIssue.identifier,
            previousParent: currentParent ? {
              id: currentParent.id,
              identifier: currentParent.identifier,
              title: currentParent.title
            } : null,
            syncId: issueUpdate.lastSyncId
          })
        }] 
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to set issue parent: ${(error as Error).message || 'Unknown error'}`
      );
    }
  },
}); 