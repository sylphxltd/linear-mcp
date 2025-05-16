import { IssueFilterSchema, defineTool } from '../../schemas/index.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  validateTeam,
  validateState,
  validateAssignee,
  validateProjectMilestone,
  mapIssueToDetails,
  type IssueFilters,
} from './shared.js';

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

    // Validation
    if (teamId) await validateTeam(linearClient, teamId, 'listing issues');
    if (stateId) {
      if (!teamId)
        throw new Error("Cannot validate stateId: 'teamId' is required when 'stateId' is provided.");
      await validateState(linearClient, teamId, stateId, 'listing issues');
    }
    if (assigneeId) await validateAssignee(linearClient, assigneeId, 'listing issues');
    if (projectMilestoneId)
      await validateProjectMilestone(linearClient, projectMilestoneId, null, 'listing issues');

    // Filters
    const filters: IssueFilters = { includeArchived, first: limit };
    if (query)
      filters.filter = {
        ...(filters.filter || {}),
        or: [
          { title: { containsIgnoreCase: query } },
          { description: { containsIgnoreCase: query } },
        ],
      };
    if (teamId) filters.teamId = teamId;
    if (stateId)
      filters.filter = {
        ...(filters.filter || {}),
        state: { id: { eq: stateId } },
      };
    if (assigneeId)
      filters.filter = {
        ...(filters.filter || {}),
        assignee: { id: { eq: assigneeId } },
      };
    if (projectMilestoneId)
      filters.filter = {
        ...(filters.filter || {}),
        projectMilestone: { id: { eq: projectMilestoneId } },
      };
    if (projectId) {
      filters.projectId = projectId;
      filters.filter = {
        ...(filters.filter || {}),
        project: { id: { eq: projectId } },
      };
    }

    // Query and map
    const issuesConnection = await linearClient.issues(
      filters as Parameters<typeof linearClient.issues>[0],
    );
    const issues = await Promise.all(
      issuesConnection.nodes.map((issueNode) => mapIssueToDetails(issueNode, false)),
    );
    return { content: [{ type: 'text', text: JSON.stringify(issues) }] };
  },
});