import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
// --- User schema (localized) ---
export const UserQuerySchema = {
  query: z.string().describe('The UUID or name of the user to retrieve'),
};

export const getUserTool = defineTool({
  name: 'get_user',
  description: 'Retrieve details of a specific Linear user',
  inputSchema: UserQuerySchema,
  handler: async ({ query }: { query: string }) => {
    const linearClient = getLinearClient();
    try {
      const user = await linearClient.user(query);
      if (user) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                active: user.active,
                admin: user.admin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              }),
            },
          ],
        };
      }
    } catch (_error: unknown) {
      // continue to search by name/email
    }
    try {
      const users = await linearClient.users({
        filter: {
          or: [{ name: { eq: query } }, { email: { eq: query } }, { displayName: { eq: query } }],
        },
      });
      if (users.nodes.length > 0) {
        const user = users.nodes[0];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                active: user.active,
                admin: user.admin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              }),
            },
          ],
        };
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get user: ${err.message || 'Unknown error'}`,
      );
    }
    // If user not found by ID, name, or email, fetch all users and include in error message
    try {
      const allUsers = await linearClient.users();
      const validUsers = allUsers.nodes.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        displayName: u.displayName,
        active: u.active,
      }));
      throw new McpError(
        ErrorCode.InvalidParams,
        `User with query "${query}" not found. Valid users are: ${JSON.stringify(validUsers, null, 2)}`,
      );
    } catch (listError: unknown) {
      const err = listError as { message?: string };
      // If listing users also fails, throw a generic not found error
      throw new McpError(
        ErrorCode.InvalidParams,
        `User with query "${query}" not found. Also failed to list available users: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
