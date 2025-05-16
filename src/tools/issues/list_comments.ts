import { z } from 'zod';
import { defineTool } from '../../schemas/index.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { validateIssueExists } from './shared.js';
import type { Comment as LinearComment } from '@linear/sdk';

export const listCommentsTool = defineTool({
  name: 'list_comments',
  description: 'Retrieve comments for a Linear issue by ID',
  inputSchema: { issueId: z.string().describe('The ID of the issue to fetch comments for') },
  handler: async ({ issueId }) => {
    const linearClient = getLinearClient();
    const issue = await validateIssueExists(linearClient, issueId, 'listing comments');
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