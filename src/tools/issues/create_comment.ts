import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapCommentToOutput } from './shared.js';
// CommentCreateSchema is now defined locally
const CommentCreateSchema = {
  issueId: z.string().describe('The UUID of the issue to add the comment to'),
  body: z.string().describe('The content of the comment in Markdown'),
};

export const createCommentTool = defineTool({
  name: 'create_comment',
  description: 'Create a comment on a Linear issue by ID',
  inputSchema: CommentCreateSchema,
  handler: async ({ issueId, body }) => {
    const linearClient = getLinearClient();
    const issue = await linearClient.issue(issueId);
    if (!issue) {
      throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${issueId}' not found.`);
    }
    const commentPayload = await linearClient.createComment({ issueId, body });
    const newComment = await commentPayload.comment;
    if (!newComment)
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create comment or retrieve details. Sync ID: ${commentPayload.lastSyncId}`,
      );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mapCommentToOutput(newComment)),
        },
      ],
    };
  },
});
