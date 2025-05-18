import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapTeamToOutput, getAvailableTeamsMessage } from './shared.js';

const TeamFilterSchema = {
  // Direct Linear API parameters
  id: z.string().uuid().optional().describe('Filter by team UUID'),
  name: z.string().optional().describe('Filter by team name (case insensitive)'),
  key: z.string().optional().describe('Filter by team key (case insensitive)'),
  includeArchived: z.boolean().default(false).describe('Include archived teams'),
  
  // Filter object for direct GraphQL filtering
  filter: z.record(z.any()).optional().describe('Direct filter object for the Linear API'),
};

export const listTeamsTool = defineTool({
  name: 'list_teams',
  description: "List or search teams in the Linear workspace",
  inputSchema: TeamFilterSchema,
  handler: async (input) => {
    try {
      const linearClient = getLinearClient();
      
      // Direct pass-through to Linear API with no transformations
      const { id, name, key, filter: inputFilter, ...otherParams } = input;
      
      // Start with other parameters
      const queryParams: any = otherParams;
      
      // Use provided filter or build one from individual fields
      if (inputFilter) {
        queryParams.filter = inputFilter;
      } else {
        const filter: Record<string, any> = {};
        
        if (id) filter.id = { eq: id };
        if (name) filter.name = { containsIgnoreCase: name };
        if (key) filter.key = { containsIgnoreCase: key };
        
        // Only add filter if we have filter conditions
        if (Object.keys(filter).length > 0) {
          queryParams.filter = filter;
        }
      }
      
      // Execute query
      const teams = await linearClient.teams(queryParams);
      
      // Map and return results
      return {
        content: [{ type: 'text', text: JSON.stringify(teams.nodes.map(mapTeamToOutput)) }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list teams: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  },
});
