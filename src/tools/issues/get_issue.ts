import { IdSchema, defineTool } from '../../schemas/index.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { mapIssueToDetails, validateIssueExists } from './shared.js';

export const getIssueTool = defineTool({
  name: 'get_issue',
  description: 'Retrieve a Linear issue details by ID, including attachments',
  inputSchema: IdSchema,
  handler: async ({ id }) => {
    const linearClient = getLinearClient();
    const issue = await validateIssueExists(linearClient, id, 'getting issue details');
    const detailedIssue = await mapIssueToDetails(issue, true);
    return { content: [{ type: 'text', text: JSON.stringify(detailedIssue) }] };
  },
});
