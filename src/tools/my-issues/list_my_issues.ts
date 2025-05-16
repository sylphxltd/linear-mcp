import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { PaginationSchema } from '../issues/shared.js';
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
      // Await state and team for each issue
      const myIssues = await Promise.all(
        issues.nodes.map(async (issue) => {
          const state = issue.state ? await issue.state : null;
          const team = issue.team ? await issue.team : null;
          const cycle = issue.cycle ? await issue.cycle : null;
          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description,
            priority: issue.priority,
            state: state?.name,
            team: team?.name,
            cycleName: cycle?.name,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            url: issue.url,
          };
        }),
      );
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
