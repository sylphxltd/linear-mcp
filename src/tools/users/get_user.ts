import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableAssigneesJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { UserQuerySchema } from './shared.js';

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
    } catch (idError: unknown) {
      const idErr = idError as Error;
      if (isEntityError(idErr.message)) {
        const availableAssignees = await getAvailableAssigneesJson(linearClient);
        throw new Error(`${idErr.message}\nAvailable assignees: ${availableAssignees}`);
      }
      // Allow to proceed to search by name/email
    }

    try {
      const users = await linearClient.users({
        filter: {
          or: [
            { name: { eqIgnoreCase: query } },
            { email: { eqIgnoreCase: query } },
            { displayName: { eqIgnoreCase: query } },
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
    } catch (nameEmailError: unknown) {
      if (nameEmailError instanceof McpError) throw nameEmailError;
      const err = nameEmailError as Error;
      // isEntityError might not be relevant here unless the search itself can cause entity-specific errors
      throw new McpError(
        ErrorCode.InternalError,
        `Error searching users by name/email "${query}": ${err.message || 'Unknown error'}`,
      );
    }

    // If user not found by ID, name, or email, throw an error with available users.
    try {
      const availableAssignees = await getAvailableAssigneesJson(linearClient);
      const notFoundMessage = `Entity not found: User - Could not find referenced User with query "${query}".`;
      if (isEntityError(notFoundMessage)) { // Check if our constructed message would be an entity error
        throw new Error(`${notFoundMessage}\nAvailable assignees (users): ${availableAssignees}`);
      }
      throw new McpError(
        ErrorCode.InvalidParams,
        `User with query "${query}" not found. Valid users (assignees) are: ${availableAssignees}`,
      );
    } catch (finalError: unknown) {
      if (finalError instanceof McpError || finalError instanceof Error) throw finalError;
      throw new McpError(
        ErrorCode.InternalError,
        `User with query "${query}" not found, and failed to list available users: ${String(finalError)}`,
      );
    }
  },
});
