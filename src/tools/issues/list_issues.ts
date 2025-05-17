import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  getAvailableAssigneesJson,
  getAvailableProjectMilestonesJson,
  getAvailableProjectsJson,
  getAvailableStatesJson,
  getAvailableTeamsJson,
  isEntityError,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueFilterSchema, mapIssueToDetails, type IssueFilters } from './shared.js';

function buildIssueFilters({
  query,
  teamId,
  stateId,
  assigneeId,
  projectMilestoneId,
  projectId,
  includeArchived = true,
  limit = 50,
}: {
  query?: string;
  teamId?: string;
  stateId?: string;
  assigneeId?: string;
  projectMilestoneId?: string;
  projectId?: string;
  includeArchived?: boolean;
  limit?: number;
}): IssueFilters {
  const filters: import('./shared.js').IssueFilters = { includeArchived, first: limit };
  if (query) {
    filters.filter = {
      ...(filters.filter || {}),
      or: [
        { title: { containsIgnoreCase: query } },
        { description: { containsIgnoreCase: query } },
      ],
    };
  }
  if (teamId) filters.teamId = teamId;
  if (stateId) {
    filters.filter = {
      ...(filters.filter || {}),
      state: { id: { eq: stateId } },
    };
  }
  if (assigneeId) {
    filters.filter = {
      ...(filters.filter || {}),
      assignee: { id: { eq: assigneeId } },
    };
  }
  if (projectMilestoneId) {
    filters.filter = {
      ...(filters.filter || {}),
      projectMilestone: { id: { eq: projectMilestoneId } },
    };
  }
  if (projectId) {
    filters.projectId = projectId;
    filters.filter = {
      ...(filters.filter || {}),
      project: { id: { eq: projectId } },
    };
  }
  return filters;
}

export const listIssuesTool = defineTool({
  name: 'list_issues',
  description: "List issues in the user's Linear workspace",
  inputSchema: IssueFilterSchema,
  handler: async (inputParams) => {
    const {
      query,
      teamId,
      stateId,
      assigneeId,
      projectMilestoneId,
      projectId,
      includeArchived = true,
      limit = 50,
    } = inputParams;
    const linearClient = getLinearClient();

    const filters = buildIssueFilters({
      query,
      teamId,
      stateId,
      assigneeId,
      projectMilestoneId,
      projectId,
      includeArchived,
      limit,
    });

    try {
      const issuesConnection = await linearClient.issues(
        filters as Parameters<typeof linearClient.issues>[0],
      );
      const issues = await Promise.all(
        issuesConnection.nodes.map((issueNode) => mapIssueToDetails(issueNode, false)),
      );
      return { content: [{ type: 'text', text: JSON.stringify(issues) }] };
    } catch (error: unknown) {
      const err = error as Error;
      if (isEntityError(err.message)) {
        let availableEntitiesJson = '[]';
        const msgLower = err.message.toLowerCase();

        if (msgLower.includes('team') && teamId) {
          availableEntitiesJson = await getAvailableTeamsJson(linearClient);
        } else if (msgLower.includes('project') && projectId) {
          availableEntitiesJson = await getAvailableProjectsJson(linearClient);
        } else if (msgLower.includes('state') && stateId) {
          availableEntitiesJson = await getAvailableStatesJson(linearClient, { teamId });
        } else if (msgLower.includes('assignee') && assigneeId) {
          availableEntitiesJson = await getAvailableAssigneesJson(linearClient);
        } else if (msgLower.includes('milestone') && projectMilestoneId) {
          // For projectMilestone, the context might be a specific project if one was part of the filter
          availableEntitiesJson = await getAvailableProjectMilestonesJson(linearClient, { projectId });
        }
        throw new Error(`${err.message}\nAvailable: ${availableEntitiesJson}`);
      }
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error listing issues: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
