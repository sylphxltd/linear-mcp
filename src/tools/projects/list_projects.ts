import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { LinearDocument } from '@linear/sdk';
import { mapProjectToOutput, getAvailableProjectsMessage } from './shared.js';
import { getAvailableTeamsMessage } from '../teams/shared.js';

const ProjectFilterSchema = {
  // Direct filter parameters
  id: z.string().uuid().optional().describe('Filter by project UUID'),
  name: z.string().optional().describe('Filter by project name (case insensitive)'),
  
  // Relationship filters
  team: z.record(z.any()).optional().describe('Filter by team'),
  teamId: z.string().uuid().optional().describe('Filter by team UUID'),
  
  // Pagination and display options
  first: z.number().min(1).max(100).default(50).describe('Max number of results'),
  before: z.string().uuid().optional().describe('Project UUID to end at'),
  after: z.string().uuid().optional().describe('Project UUID to start from'),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt').describe('Sort order'),
  includeArchived: z.boolean().default(false).describe('Include archived projects'),
  
  // Direct filter object
  filter: z.record(z.any()).optional().describe('Direct filter object for the Linear API'),
};

export const listProjectsTool = defineTool({
  name: 'list_projects',
  description: "List projects in the user's Linear workspace",
  inputSchema: ProjectFilterSchema,
  handler: async (input) => {
    try {
      const linearClient = getLinearClient();
      
      // Extract filter fields and other parameters
      const {
        id, name, team, teamId, filter: inputFilter,
        ...otherParams
      } = input;
      
      // Start with other parameters
      const queryParams: any = {
        ...otherParams,
        orderBy: input.orderBy === 'createdAt'
          ? LinearDocument.PaginationOrderBy.CreatedAt
          : LinearDocument.PaginationOrderBy.UpdatedAt,
      };
      
      // Use provided filter or build one from individual fields
      if (inputFilter) {
        queryParams.filter = inputFilter;
      } else {
        const filter: Record<string, any> = {};
        
        // Direct filters
        if (id) filter.id = { eq: id };
        if (name) filter.name = { containsIgnoreCase: name };
        
        // Relationship filters
        if (team) filter.team = team;
        else if (teamId) filter.team = { id: { eq: teamId } };
        
        // Only add filter if we have filter conditions
        if (Object.keys(filter).length > 0) {
          queryParams.filter = filter;
        }
      }
      
      // Execute query
      const projects = await linearClient.projects(queryParams);
      
      // Map and return results
      return {
        content: [{ type: 'text', text: JSON.stringify(projects.nodes.map(mapProjectToOutput)) }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list projects: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  },
});
