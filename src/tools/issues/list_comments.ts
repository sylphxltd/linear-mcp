import type { Comment as LinearComment } from '@linear/sdk';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';

export const listCommentsTool = defineTool({
  name: 'list_comments',
  description: 'Retrieve comments for a Linear issue by ID',
  inputSchema: { issueId: z.string().describe('The ID of the issue to fetch comments for') },
  handler: async ({ issueId }) => {
    const linearClient = getLinearClient();
    const issue = await linearClient.issue(issueId);
    if (!issue) {
      throw new Error(`Issue with ID '${issueId}' not found.`);
    }
    const comments = await issue.comments();
    const commentDetails = comments.nodes.map((comment: LinearComment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      userId: comment.userId,
    }));
    return { content: [{ type: 'text', text: JSON.stringify(commentDetails) }] };
  },
});
