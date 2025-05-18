import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { getAvailableUsersMessage, mapUserToOutput } from './shared.js';

export const listUsersTool = defineTool({
  name: 'list_users',
  description: 'Retrieve users in the Linear workspace',
  inputSchema: {
    // Direct Linear API parameters
    id: z.string().optional().describe('Filter by user UUID'),
    name: z.string().optional().describe('Filter by user name (case insensitive)'),
    displayName: z.string().optional().describe('Filter by user display name (case insensitive)'),
    email: z.string().optional().describe('Filter by user email (case insensitive)'),
    
    // Pagination parameters
    first: z.number().optional().default(50).describe('The number of items to return'),
    before: z.string().optional().describe('A UUID to end at'),
    after: z.string().optional().describe('A UUID to start from'),
    orderBy: z.enum(['createdAt', 'updatedAt']).optional().default('updatedAt'),
    
    // Filter object for direct GraphQL filtering
    filter: z.record(z.any()).optional().describe('Direct filter object for the Linear API'),
  },
  handler: async (input) => {
    try {
      const linearClient = getLinearClient();
      
      // Direct pass-through to Linear API with no transformations
      const { id, name, displayName, email, filter: inputFilter, ...otherParams } = input;
      
      // Start with other parameters
      const queryParams: any = otherParams;
      
      // Use provided filter or build one from individual fields
      if (inputFilter) {
        queryParams.filter = inputFilter;
      } else {
        const filter: Record<string, any> = {};
        
        if (id) filter.id = { eq: id };
        if (name) filter.name = { containsIgnoreCase: name };
        if (displayName) filter.displayName = { containsIgnoreCase: displayName };
        if (email) filter.email = { containsIgnoreCase: email };
        
        // Only add filter if we have filter conditions
        if (Object.keys(filter).length > 0) {
          queryParams.filter = filter;
        }
      }
      
      // Execute query
      const users = await linearClient.users(queryParams);
      
      // Map and return results
      return {
        content: [{ type: 'text', text: JSON.stringify(users.nodes.map(mapUserToOutput)) }],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list users: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  },
});
