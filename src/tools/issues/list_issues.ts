import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { type IssueFilters, mapIssueToDetails, getAvailableIssuesMessage } from './shared.js';

// Direct Linear API parameters schema
const IssueFilterSchema = {
  // Direct filter parameters
  id: z.string().optional().describe('Filter by issue UUID'),
  identifier: z.string().optional().describe('Filter by issue identifier (e.g., ENG-123)'),
  title: z.string().optional().describe('Filter by issue title'),
  description: z.string().optional().describe('Filter by issue description'),
  
  // Relationship filters
  team: z.record(z.any()).optional().describe('Filter by team'),
  teamId: z.string().optional().describe('Filter by team ID'),
  assignee: z.record(z.any()).optional().describe('Filter by assignee'),
  assigneeId: z.string().optional().describe('Filter by assignee ID'),
  state: z.record(z.any()).optional().describe('Filter by state'),
  stateId: z.string().optional().describe('Filter by state ID'),
  project: z.record(z.any()).optional().describe('Filter by project'),
  projectId: z.string().optional().describe('Filter by project ID'),
  projectMilestone: z.record(z.any()).optional().describe('Filter by project milestone'),
  projectMilestoneId: z.string().optional().describe('Filter by project milestone ID'),
  
  // Pagination and display options
  first: z.number().default(50).describe('Number of issues to return'),
  after: z.string().optional().describe('Cursor to start after'),
  before: z.string().optional().describe('Cursor to end before'),
  includeArchived: z.boolean().default(false).describe('Include archived issues'),
  
  // Direct filter object
  filter: z.record(z.any()).optional().describe('Direct filter object for the Linear API'),
};

export const listIssuesTool = defineTool({
  name: 'list_issues',
  description: "List issues in the user's Linear workspace",
  inputSchema: IssueFilterSchema,
  handler: async (input) => {
    try {
      const linearClient = getLinearClient();
      
      // Extract filter fields and other parameters
      const {
        id, identifier, title, description,
        team, teamId, assignee, assigneeId, state, stateId,
        project, projectId, projectMilestone, projectMilestoneId,
        filter: inputFilter,
        ...otherParams
      } = input;
      
      // Start with other parameters
      const queryParams: any = otherParams;
      
      // Use provided filter or build one from individual fields
      if (inputFilter) {
        queryParams.filter = inputFilter;
      } else {
        const filter: Record<string, any> = {};
        
        // Direct filters
        if (id) filter.id = { eq: id };
        if (identifier) filter.identifier = { eq: identifier };
        if (title) filter.title = { containsIgnoreCase: title };
        if (description) filter.description = { containsIgnoreCase: description };
        
        // Relationship filters - use provided objects or build from IDs
        if (team) filter.team = team;
        else if (teamId) filter.team = { id: { eq: teamId } };
        
        if (assignee) filter.assignee = assignee;
        else if (assigneeId) filter.assignee = { id: { eq: assigneeId } };
        
        if (state) filter.state = state;
        else if (stateId) filter.state = { id: { eq: stateId } };
        
        if (project) filter.project = project;
        else if (projectId) filter.project = { id: { eq: projectId } };
        
        if (projectMilestone) filter.projectMilestone = projectMilestone;
        else if (projectMilestoneId) filter.projectMilestone = { id: { eq: projectMilestoneId } };
        
        // Only add filter if we have filter conditions
        if (Object.keys(filter).length > 0) {
          queryParams.filter = filter;
        }
      }
      
      // Execute query
      const issues = await linearClient.issues(queryParams);
      
      // Map and return results
      const mappedIssues = await Promise.all(
        issues.nodes.map(issue => mapIssueToDetails(issue, false))
      );
      
      return { content: [{ type: 'text', text: JSON.stringify(mappedIssues) }] };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list issues: ${(error as Error).message || 'Unknown error'}`
      );
    }
  },
});
