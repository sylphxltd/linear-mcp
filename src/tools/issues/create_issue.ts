import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  getAvailableAssigneesJson,
  getAvailableLabelsJson,
  getAvailableProjectMilestonesJson,
  getAvailableProjectsJson,
  getAvailableStatesJson,
  getAvailableTeamsJson,
  isEntityError,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueCreateSchema, mapIssueToDetails } from './shared.js';

export const createIssueTool = defineTool({
  name: 'create_issue',
  description: 'Create a new Linear issue',
  inputSchema: IssueCreateSchema,
  handler: async (input) => {
    const {
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
    } = input;
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

    try {
      const issueCreate = await linearClient.createIssue(payload);
      const newIssue = await issueCreate.issue;
      if (!newIssue) {
        throw new Error(
          `Failed to create issue or retrieve details. Sync ID: ${issueCreate.lastSyncId}`,
        );
      }
      const detailedNewIssue = await mapIssueToDetails(newIssue, false);
      return { content: [{ type: 'text', text: JSON.stringify(detailedNewIssue) }] };
    } catch (error: unknown) {
      const err = error as Error;
      if (isEntityError(err.message)) {
        let availableEntitiesJson = '[]';
        // Determine context for fetching available entities
        if (err.message.toLowerCase().includes('team')) {
          availableEntitiesJson = await getAvailableTeamsJson(linearClient);
        } else if (err.message.toLowerCase().includes('project id') || (projectId && err.message.toLowerCase().includes(projectId.toLowerCase()))) {
          availableEntitiesJson = await getAvailableProjectsJson(linearClient);
        } else if (err.message.toLowerCase().includes('state') || (stateId && err.message.toLowerCase().includes(stateId.toLowerCase()))) {
          availableEntitiesJson = await getAvailableStatesJson(linearClient, { teamId });
        } else if (err.message.toLowerCase().includes('assignee') || (assigneeId && err.message.toLowerCase().includes(assigneeId.toLowerCase()))) {
          availableEntitiesJson = await getAvailableAssigneesJson(linearClient);
        } else if (err.message.toLowerCase().includes('label') || (labelIds?.some(id => err.message.toLowerCase().includes(id.toLowerCase())))) {
          availableEntitiesJson = await getAvailableLabelsJson(linearClient, { teamId });
        } else if (err.message.toLowerCase().includes('milestone') || (projectMilestoneId && err.message.toLowerCase().includes(projectMilestoneId.toLowerCase()))) {
          availableEntitiesJson = await getAvailableProjectMilestonesJson(linearClient, { projectId });
        }
        throw new Error(`${err.message}\nAvailable: ${availableEntitiesJson}`);
      }
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create issue: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
