import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { PaginationSchema, mapToMyIssueOutput } from './shared.js';
import { defineTool } from '../shared/tool-definition.js';

export const listMyIssuesTool = defineTool({
  name: 'list_my_issues',
  description: 'List issues assigned to the current user',
  inputSchema: PaginationSchema,
  handler: async ({ limit, before, after }) => {
    const linearClient = getLinearClient();
    try {
      const viewer = await linearClient.viewer;
      const issues = await linearClient.issues({
        filter: {
          assignee: { id: { eq: viewer.id } },
        },
        first: limit,
        before,
        after,
      });
      const myIssues = await Promise.all(issues.nodes.map(mapToMyIssueOutput));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(myIssues),
          },
        ],
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list my issues: ${err.message || 'Unknown error'}`,
      );
    }
  },
});