import { IssueUpdateSchema, defineTool } from '../../schemas/index.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  validateIssueExists,
  validateProject,
  validateState,
  validateAssignee,
  validateLabels,
  validateProjectMilestone,
  mapIssueToDetails,
} from './shared.js';

export const updateIssueTool = defineTool({
  name: 'update_issue',
  description: 'Update an existing Linear issue',
  inputSchema: IssueUpdateSchema,
  handler: async (args) => {
    const { id, title, description, priority, projectId, stateId, assigneeId, labelIds, dueDate, projectMilestoneId } = args;
    const linearClient = getLinearClient();
    const issueToUpdate = await validateIssueExists(linearClient, id, 'updating issue');
    const currentTeamId = (await issueToUpdate.team)?.id;
    const currentProjectId = (await issueToUpdate.project)?.id;

    if (projectId) await validateProject(linearClient, projectId, 'updating issue');
    if (stateId) {
      if (!currentTeamId) throw new Error(`Issue '${id}' has no team, cannot validate stateId.`);
      await validateState(linearClient, currentTeamId, stateId, 'updating issue');
    }
    if (assigneeId) await validateAssignee(linearClient, assigneeId, 'updating issue');
    if (labelIds && labelIds.length > 0) {
      if (!currentTeamId) throw new Error(`Issue '${id}' has no team, cannot validate labelIds.`);
      await validateLabels(linearClient, currentTeamId, labelIds, 'updating issue');
    }
    if (projectMilestoneId === null || projectMilestoneId) {
      if (projectMilestoneId) {
        await validateProjectMilestone(linearClient, projectMilestoneId, projectId ?? currentProjectId, 'updating issue');
      }
    }

    const payload: Partial<typeof args> = { title, description, priority, projectId, stateId, assigneeId, labelIds, dueDate, projectMilestoneId };
    const updatePayload = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
    const issueUpdate = await linearClient.updateIssue(id, updatePayload);
    const updatedIssue = await issueUpdate.issue;
    if (!updatedIssue) throw new Error(`Failed to update issue or retrieve details. Sync ID: ${issueUpdate.lastSyncId}`);
    const detailedUpdatedIssue = await mapIssueToDetails(updatedIssue, false);
    return { content: [{ type: 'text', text: JSON.stringify(detailedUpdatedIssue) }] };
  },
});