import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { mapUserToOutput, mapUserToSummary } from './shared.js';

const UserQuerySchema = {
  id: z.string().uuid().optional().describe('User UUID'),
  email: z.string().email().optional().describe('User email'),
  name: z.string().optional().describe('User name or display name'),
};

export const getUserTool = defineTool({
  name: 'get_user',
  description: 'Retrieve details of a specific Linear user',
  inputSchema: UserQuerySchema,
  handler: async (input) => {
    const linearClient = getLinearClient();
    let user;

    try {
      if (!input.id && !input.email && !input.name) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Must provide either id, email, or name to find a user',
        );
      }

      // Try specific ID first
      if (input.id) {
        user = await linearClient.user(input.id);
        if (user) {
          return {
            content: [{ type: 'text', text: JSON.stringify(mapUserToOutput(user)) }],
          };
        }
        throw new McpError(ErrorCode.InvalidParams, `User with ID '${input.id}' not found`);
      }

      // Search by email or name
      const filter: Record<string, unknown> = {};
      if (input.email) filter.email = { eq: input.email };
      if (input.name) {
        filter.or = [
          { name: { eq: input.name } },
          { displayName: { eq: input.name } },
        ];
      }

      const users = await linearClient.users({ filter });
      if (users.nodes.length === 0) {
        const allUsers = await linearClient.users();
        const validUsers = allUsers.nodes.map(mapUserToSummary);
        throw new McpError(
          ErrorCode.InvalidParams,
          `User not found. Available users: ${JSON.stringify(validUsers, null, 2)}`,
        );
      }

      if (users.nodes.length > 1) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Multiple users found. Please use a more specific search.',
        );
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(mapUserToOutput(users.nodes[0])) }],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get user: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  },
});
