import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueCreateSchema } from './shared.js';
import {
  mapIssueToDetails,
  validateAssignee,
  validateLabels,
  validateProject,
  validateProjectMilestone,
  validateState,
  validateTeam,
} from './shared.js';

export const createIssueTool = defineTool({
  name: 'create_issue',
  description: 'Create a new Linear issue',
  inputSchema: IssueCreateSchema,
  handler: async ({ title, description, teamId, priority, projectId, stateId, assigneeId, labelIds, dueDate, projectMilestoneId }) => {
    const linearClient = getLinearClient();
    await validateTeam(linearClient, teamId, 'creating issue');
    if (projectId) await validateProject(linearClient, projectId, 'creating issue');
    if (stateId) await validateState(linearClient, teamId, stateId, 'creating issue');
    if (assigneeId) await validateAssignee(linearClient, assigneeId, 'creating issue');
    if (labelIds && labelIds.length > 0)
      await validateLabels(linearClient, teamId, labelIds, 'creating issue');
    if (projectMilestoneId)
      await validateProjectMilestone(linearClient, projectMilestoneId, projectId, 'creating issue');

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
