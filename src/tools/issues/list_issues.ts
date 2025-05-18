import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
// IssueFilterSchema is now defined locally
const IssueFilterSchema = {
  // Core filters
  query: z.string().optional().describe('Search in title and description'),
  teamId: z.string().optional().describe('Filter by team UUID'),
  assigneeId: z.string().optional().describe('Filter by assignee UUID'),
  stateId: z.string().optional().describe('Filter by workflow state UUID'),
  
  // Project-related filters
  projectId: z.string().optional().describe('Filter by project UUID'),
  projectMilestoneId: z.string().uuid('Invalid project milestone ID').optional().describe('Filter by project milestone UUID'),
  
  // Pagination and display
  limit: z.number().default(50).describe('Number of issues to return'),
  includeArchived: z.boolean().default(false).describe('Include archived issues'),
};
import { type IssueFilters, mapIssueToDetails } from './shared.js';
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
  const filters: IssueFilters = { includeArchived, first: limit };
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
