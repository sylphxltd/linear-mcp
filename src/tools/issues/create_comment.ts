import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { isEntityError } from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { CommentCreateSchema } from './shared.js';

export const createCommentTool = defineTool({
  name: 'create_comment',
  description: 'Create a comment on a Linear issue by ID',
  inputSchema: CommentCreateSchema,
  handler: async ({ issueId, body }) => {
    const linearClient = getLinearClient();
    try {
      // We don't need to pre-validate issueId here,
      // linearClient.createComment will fail if issueId is invalid,
      // and the catch block will handle it.
      const commentPayload = await linearClient.createComment({ issueId, body });
      const newComment = await commentPayload.comment;
      if (!newComment) {
        throw new Error(
          `Failed to create comment or retrieve details. Sync ID: ${commentPayload.lastSyncId}`,
        );
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: newComment.id,
              body: newComment.body,
              createdAt: newComment.createdAt,
              updatedAt: newComment.updatedAt,
              userId: newComment.userId,
            }),
          },
        ],
      };
    } catch (error: unknown) {
      const err = error as Error;
      if (isEntityError(err.message)) {
        // Primarily, this would be if the issueId itself is invalid or not found.
        throw new Error(`${err.message}\n(Context: Trying to create comment on issue ID '${issueId}')`);
      }
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error creating comment on issue ID '${issueId}': ${err.message || 'Unknown error'}`,
      );
    }
  },
});
