import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { isEntityError } from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { IdSchema } from './shared.js';

export const getIssueGitBranchNameTool = defineTool({
  name: 'get_issue_git_branch_name',
  description: 'Retrieve the branch name for a Linear issue by ID',
  inputSchema: IdSchema,
  handler: async ({ id }) => {
    const linearClient = getLinearClient();
    try {
      const issue = await linearClient.issue(id);
      if (!issue) {
        throw new Error(`Issue with ID '${id}' was unexpectedly not found and did not throw an error.`);
      }
      const branchName = await issue.branchName;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              branchName,
            }),
          },
        ],
      };
    } catch (error: unknown) {
      const err = error as Error;
      if (isEntityError(err.message)) {
        throw new Error(`${err.message}\n(Context: Trying to get branch name for issue ID '${id}')`);
      }
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error getting branch name for issue ID '${id}': ${err.message || 'Unknown error'}`,
      );
    }
  },
});
