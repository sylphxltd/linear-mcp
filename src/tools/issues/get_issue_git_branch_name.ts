import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IdSchema } from './shared.js';
import { validateIssueExists } from './shared.js';

export const getIssueGitBranchNameTool = defineTool({
  name: 'get_issue_git_branch_name',
  description: 'Retrieve the branch name for a Linear issue by ID',
  inputSchema: IdSchema,
  handler: async ({ id }) => {
    const linearClient = getLinearClient();
    const issue = await validateIssueExists(linearClient, id, 'getting git branch name');
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
  },
});
