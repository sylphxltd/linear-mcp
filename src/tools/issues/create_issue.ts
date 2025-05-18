import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
// IssueCreateSchema is now defined locally
const IssueCreateSchema = {
  title: z.string().describe('The title of the issue.'),
  teamId: z.string().describe('The identifier of the team associated with the issue.'),
  description: z.string().optional().describe('The issue description in markdown format.'),
  priority: z.number().optional().describe('The priority of the issue. 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low.'),
  assigneeId: z.string().optional().describe('The identifier of the user to assign the issue to.'),
  projectId: z.string().optional().describe('The project associated with the issue.'),
  projectMilestoneId: z.string().optional().describe('The project milestone associated with the issue.'),
  stateId: z.string().optional().describe('The team state of the issue.'),
  labelIds: z.array(z.string()).optional().describe('The identifiers of the issue labels associated with this ticket.'),
  parentId: z.string().optional().describe('The identifier of the parent issue.'),
  subscriberIds: z.array(z.string()).optional().describe('The identifiers of the users subscribing to this ticket.'),
  estimate: z.number().optional().describe('The estimated complexity of the issue.'),
  dueDate: z.string().optional().describe('The date at which the issue is due.'),
  cycleId: z.string().optional().describe('The cycle associated with the issue.'),
};
import { mapIssueToDetails } from './shared.js';

export const createIssueTool = defineTool({
  name: 'create_issue',
  description: 'Create a new Linear issue',
  inputSchema: IssueCreateSchema,
  handler: async (input) => {
    const linearClient = getLinearClient();
    const payload = { ...input };
    const issueCreate = await linearClient.createIssue(payload);
    const newIssue = await issueCreate.issue;
    if (!newIssue)
      throw new Error(
        `Failed to create issue or retrieve details. Sync ID: ${issueCreate.lastSyncId}`,
      );
    const detailedNewIssue = await mapIssueToDetails(newIssue, false);
    return { content: [{ type: 'text', text: JSON.stringify(detailedNewIssue) }] };
  },
});
