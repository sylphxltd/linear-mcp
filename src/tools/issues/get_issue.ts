import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IdSchema } from './shared.js';
import { mapIssueToDetails } from './shared.js';

export const getIssueTool = defineTool({
  name: 'get_issue',
  description: 'Retrieve a Linear issue details by ID, including attachments',
  inputSchema: IdSchema,
  handler: async ({ id }) => {
    const linearClient = getLinearClient();
    const issue = await linearClient.issue(id);
    if (!issue) {
      throw new Error(`Issue with ID '${id}' not found.`);
    }
    const detailedIssue = await mapIssueToDetails(issue, true);
    return { content: [{ type: 'text', text: JSON.stringify(detailedIssue) }] };
  },
});
