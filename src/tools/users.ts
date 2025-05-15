import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../utils/linear-client.js';
import { defineTool, UserQuerySchema } from '../schemas/index.js';

export const listUsersTool = defineTool({
  name: 'list_users',
  description: 'Retrieve users in the Linear workspace',
  inputSchema: {},
  handler: async () => {
    try {
      const linearClient = getLinearClient();
      const users = await linearClient.users();
      const userList = users.nodes.map((user: {
        id: string;
        name: string;
        email: string;
        displayName: string;
        avatarUrl?: string;
        active: boolean;
        admin: boolean;
        createdAt: Date;
        updatedAt: Date;
      }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        active: user.active,
        admin: user.admin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(userList),
          },
        ],
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list users: ${err.message || 'Unknown error'}`
      );
    }
  },
});

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
    } catch (error: unknown) {
      // continue to search by name/email
    }
    try {
      const users = await linearClient.users({
        filter: {
          or: [
            { name: { eq: query } },
            { email: { eq: query } },
            { displayName: { eq: query } },
          ],
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
        `Failed to get user: ${err.message || 'Unknown error'}`
      );
    }
    throw new McpError(ErrorCode.MethodNotFound, `User with ID or name "${query}" not found`);
  },
});

export const userTools = {
  listUsersTool,
  getUserTool,
};