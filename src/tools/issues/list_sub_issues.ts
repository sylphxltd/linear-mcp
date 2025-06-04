import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapIssueToDetails } from './shared.js';

const ListSubIssuesSchema = {
  parentId: z.string().describe('The ID of the parent issue to list sub-issues for'),
  includeDetails: z.boolean().default(false).describe('Whether to include detailed information for each sub-issue'),
};

export const listSubIssuesTool = defineTool({
  name: 'list_sub_issues',
  description: 'List sub-issues for a given parent issue',
  inputSchema: ListSubIssuesSchema,
  handler: async ({ parentId, includeDetails }) => {
    try {
      const linearClient = getLinearClient();
      
      // Get the parent issue first to verify it exists
      const parentIssue = await linearClient.issue(parentId);
      if (!parentIssue) {
        throw new McpError(ErrorCode.InvalidParams, `Parent issue with ID '${parentId}' not found.`);
      }

      // Get the sub-issues (children)
      const subIssuesConnection = await parentIssue.children();
      
      if (includeDetails) {
        // Map each sub-issue to detailed format
        const detailedSubIssues = await Promise.all(
          subIssuesConnection.nodes.map(subIssue => mapIssueToDetails(subIssue, false, false))
        );
        
        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              parentId,
              parentTitle: parentIssue.title,
              parentIdentifier: parentIssue.identifier,
              subIssues: detailedSubIssues,
              totalCount: subIssuesConnection.nodes.length
            })
          }] 
        };
      } else {
        // Return simplified sub-issue list
        const simplifiedSubIssues = subIssuesConnection.nodes.map(subIssue => ({
          id: subIssue.id,
          identifier: subIssue.identifier,
          title: subIssue.title,
          priority: subIssue.priority,
          url: subIssue.url
        }));
        
        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              parentId,
              parentTitle: parentIssue.title,
              parentIdentifier: parentIssue.identifier,
              subIssues: simplifiedSubIssues,
              totalCount: subIssuesConnection.nodes.length
            })
          }] 
        };
      }
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list sub-issues: ${(error as Error).message || 'Unknown error'}`
      );
    }
  },
}); 