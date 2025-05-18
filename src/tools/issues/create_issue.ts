import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueCreateSchema } from './schemas.js';
import { mapIssueToDetails } from './mappers.js';

export const createIssueTool = defineTool({
  name: 'create_issue',
  description: 'Create a new Linear issue',
  inputSchema: IssueCreateSchema,
  handler: async ({
    title,
    description,
    teamId,
    priority,
    projectId,
    stateId,
    assigneeId,
    labelIds,
    dueDate,
    projectMilestoneId,
  }) => {
    const linearClient = getLinearClient();
    const payload = {
      title,
      description,
      teamId,
      priority,
      projectId,
      stateId,
      assigneeId,
      labelIds,
      dueDate,
      projectMilestoneId,
    };
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
