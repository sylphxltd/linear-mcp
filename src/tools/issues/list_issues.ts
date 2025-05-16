import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueFilterSchema } from './shared.js';
import {
  type IssueFilters,
  mapIssueToDetails,
  validateAssignee,
  validateProjectMilestone,
  validateState,
  validateTeam,
} from './shared.js';
async function validateListIssuesInput(
  linearClient: ReturnType<typeof getLinearClient>,
  {
    teamId,
    stateId,
    assigneeId,
    projectMilestoneId,
  }: {
    teamId?: string;
    stateId?: string;
    assigneeId?: string;
    projectMilestoneId?: string;
  },
) {
  if (teamId) await validateTeam(linearClient, teamId, 'listing issues');
  if (stateId) {
    if (!teamId)
      throw new Error("Cannot validate stateId: 'teamId' is required when 'stateId' is provided.");
    await validateState(linearClient, teamId, stateId, 'listing issues');
  }
  if (assigneeId) await validateAssignee(linearClient, assigneeId, 'listing issues');
  if (projectMilestoneId)
    await validateProjectMilestone(linearClient, projectMilestoneId, null, 'listing issues');
}
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
}): import('./shared.js').IssueFilters {
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
  handler: async ({
    query,
    teamId,
    stateId,
    assigneeId,
    projectMilestoneId,
    projectId,
    includeArchived = true,
    limit = 50,
  }) => {
    const linearClient = getLinearClient();
    await validateListIssuesInput(linearClient, {
      teamId,
      stateId,
      assigneeId,
      projectMilestoneId,
    });
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
    const issuesConnection = await linearClient.issues(
      filters as Parameters<typeof linearClient.issues>[0],
    );
    const issues = await Promise.all(
      issuesConnection.nodes.map((issueNode) => mapIssueToDetails(issueNode, false)),
    );
    return { content: [{ type: 'text', text: JSON.stringify(issues) }] };
  },
});
