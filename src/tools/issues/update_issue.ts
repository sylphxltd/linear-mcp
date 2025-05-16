import type { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueUpdateSchema } from './shared.js';
import {
  mapIssueToDetails,
  validateAssignee,
  validateIssueExists,
  validateLabels,
  validateProject,
  validateProjectMilestone,
  validateState,
} from './shared.js';

export const updateIssueTool = defineTool({
  name: 'update_issue',
  description: 'Update an existing Linear issue',
  inputSchema: IssueUpdateSchema,
  handler: async ({ id, title, description, priority, projectId, stateId, assigneeId, labelIds, dueDate, projectMilestoneId }) => {
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
        await validateProjectMilestone(
          linearClient,
          projectMilestoneId,
          projectId ?? currentProjectId,
          'updating issue',
        );
      }
    }
 
     const updatePayload = {
       ...(title !== undefined && { title }),
       ...(description !== undefined && { description }),
       ...(priority !== undefined && { priority }),
       ...(projectId !== undefined && { projectId }),
       ...(stateId !== undefined && { stateId }),
       ...(assigneeId !== undefined && { assigneeId }),
       ...(labelIds !== undefined && { labelIds }),
       ...(dueDate !== undefined && { dueDate }),
       ...(projectMilestoneId !== undefined && { projectMilestoneId }),
     };
     const issueUpdate = await linearClient.updateIssue(id, updatePayload);
    const updatedIssue = await issueUpdate.issue;
    if (!updatedIssue)
      throw new Error(
        `Failed to update issue or retrieve details. Sync ID: ${issueUpdate.lastSyncId}`,
      );
    const detailedUpdatedIssue = await mapIssueToDetails(updatedIssue, false);
    return { content: [{ type: 'text', text: JSON.stringify(detailedUpdatedIssue) }] };
  },
});
