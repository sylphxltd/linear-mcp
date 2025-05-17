import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { isEntityError } from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';

export const listUsersTool = defineTool({
  name: 'list_users',
  description: 'Retrieve users in the Linear workspace',
  inputSchema: {},
  handler: async () => {
    try {
      const linearClient = getLinearClient();
      const users = await linearClient.users();
      const userList = users.nodes.map(
        (user: {
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
        }),
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(userList),
          },
        ],
      };
    } catch (error: unknown) {
      if (error instanceof McpError) throw error;
      const err = error as Error;
      if (isEntityError(err.message)) {
        throw new Error(err.message);
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list users: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
