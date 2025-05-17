import type { Comment as LinearComment } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { isEntityError } from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';

export const listCommentsTool = defineTool({
  name: 'list_comments',
  description: 'Retrieve comments for a Linear issue by ID',
  inputSchema: { issueId: z.string().describe('The ID of the issue to fetch comments for') },
  handler: async ({ issueId }) => {
    const linearClient = getLinearClient();
    try {
      const issue = await linearClient.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID '${issueId}' was unexpectedly not found and did not throw an error while trying to list comments.`);
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
    } catch (error: unknown) {
      const err = error as Error;
      if (isEntityError(err.message)) {
        // Primarily, this would be if the issueId itself is invalid or not found.
        throw new Error(`${err.message}\n(Context: Trying to list comments for issue ID '${issueId}')`);
      }
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error listing comments for issue ID '${issueId}': ${err.message || 'Unknown error'}`,
      );
    }
  },
});
