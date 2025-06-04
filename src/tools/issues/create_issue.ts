import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
// IssueCreateSchema is now defined locally
const IssueCreateSchema = {
  // Required fields
  title: z.string().describe('Issue title'),
  teamId: z.string().describe('Team ID'),
  
  // Common optional fields
  description: z.string().optional().describe('Description in markdown'),
  priority: z.number().optional().describe('Priority (0=None, 1=Urgent, 2=High, 3=Normal, 4=Low)'),
  assigneeId: z.string().optional().describe('Assignee user ID'),
  labelIds: z.array(z.string()).optional().describe('Label IDs'),
  stateId: z.string().optional().describe('Workflow state ID'),
  projectId: z.string().optional().describe('Project ID to assign the issue to'),
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
