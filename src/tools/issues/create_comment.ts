import { CommentCreateSchema, defineTool } from '../../schemas/index.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { validateIssueExists } from './shared.js';

export const createCommentTool = defineTool({
  name: 'create_comment',
  description: 'Create a comment on a Linear issue by ID',
  inputSchema: CommentCreateSchema,
  handler: async ({ issueId, body }) => {
    const linearClient = getLinearClient();
    await validateIssueExists(linearClient, issueId, 'creating comment');
    const commentPayload = await linearClient.createComment({ issueId, body });
    const newComment = await commentPayload.comment;
    if (!newComment) throw new Error(`Failed to create comment or retrieve details. Sync ID: ${commentPayload.lastSyncId}`);
    return {
      content: [{ type: 'text', text: JSON.stringify({
        id: newComment.id, body: newComment.body, createdAt: newComment.createdAt, updatedAt: newComment.updatedAt, userId: newComment.userId,
      })}]
    };
  },
});