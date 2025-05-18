import { z } from 'zod';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { mapCommentToOutput } from './shared.js';

export const listCommentsTool = defineTool({
  name: 'list_comments',
  description: 'Retrieve comments for a Linear issue by ID',
  inputSchema: { issueId: z.string().describe('The ID of the issue to fetch comments for') },
  handler: async ({ issueId }) => {
    const linearClient = getLinearClient();
    const issue = await linearClient.issue(issueId);
    if (!issue) {
      throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${issueId}' not found.`);
    }
    const comments = await issue.comments();
    const commentDetails = comments.nodes.map(mapCommentToOutput);
    return { content: [{ type: 'text', text: JSON.stringify(commentDetails) }] };
  },
});
