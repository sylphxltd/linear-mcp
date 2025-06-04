import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapIssueToDetails } from './shared.js';

const CreateSubIssueSchema = {
  // Required fields
  parentId: z.string().describe('The ID of the parent issue'),
  title: z.string().describe('Sub-issue title'),
  
  // Optional fields (inherited from parent if not specified)
  description: z.string().optional().describe('Sub-issue description in markdown'),
  priority: z.number().optional().describe('Priority (0=None, 1=Urgent, 2=High, 3=Normal, 4=Low)'),
  assigneeId: z.string().optional().describe('Assignee user ID'),
  labelIds: z.array(z.string()).optional().describe('Label IDs'),
  stateId: z.string().optional().describe('Workflow state ID'),
  
  // Sub-issue specific options
  copyPropertiesFromParent: z.boolean().default(true).describe('Whether to copy project, cycle, and other properties from parent'),
};

export const createSubIssueTool = defineTool({
  name: 'create_sub_issue',
  description: 'Create a new sub-issue under a parent issue',
  inputSchema: CreateSubIssueSchema,
  handler: async ({ parentId, title, description, priority, assigneeId, labelIds, stateId, copyPropertiesFromParent }) => {
    try {
      const linearClient = getLinearClient();
      
      // Get the parent issue first to verify it exists and get team info
      const parentIssue = await linearClient.issue(parentId);
      if (!parentIssue) {
        throw new McpError(ErrorCode.InvalidParams, `Parent issue with ID '${parentId}' not found.`);
      }

      // Build the create payload
      const createPayload: any = {
        title,
        parentId,
        teamId: parentIssue.teamId, // Sub-issues must be in the same team as parent
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(labelIds !== undefined && { labelIds }),
        ...(stateId !== undefined && { stateId }),
      };

      // Copy properties from parent if requested
      if (copyPropertiesFromParent) {
        if (parentIssue.projectId) {
          createPayload.projectId = parentIssue.projectId;
        }
        if (parentIssue.cycleId) {
          createPayload.cycleId = parentIssue.cycleId;
        }
        if (parentIssue.projectMilestoneId) {
          createPayload.projectMilestoneId = parentIssue.projectMilestoneId;
        }
      }

      // Create the sub-issue
      const issueCreate = await linearClient.createIssue(createPayload);
      const newSubIssue = await issueCreate.issue;
      
      if (!newSubIssue) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create sub-issue or retrieve details. Sync ID: ${issueCreate.lastSyncId}`
        );
      }

      // Return detailed information about the created sub-issue
      const detailedSubIssue = await mapIssueToDetails(newSubIssue, false, false);
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            success: true,
            subIssue: detailedSubIssue,
            parentId,
            parentTitle: parentIssue.title,
            parentIdentifier: parentIssue.identifier,
            syncId: issueCreate.lastSyncId
          })
        }] 
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create sub-issue: ${(error as Error).message || 'Unknown error'}`
      );
    }
  },
}); 