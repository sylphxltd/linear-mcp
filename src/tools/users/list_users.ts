import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { mapUserToOutput } from './shared.js';

export const listUsersTool = defineTool({
  name: 'list_users',
  description: 'Retrieve users in the Linear workspace',
  inputSchema: {},
  handler: async () => {
    try {
      const linearClient = getLinearClient();
      const users = await linearClient.users();
      const userList = users.nodes.map(mapUserToOutput);
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
        `Failed to list users: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
