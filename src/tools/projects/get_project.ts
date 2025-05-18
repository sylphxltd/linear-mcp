import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapProjectToOutput } from './shared.js';
// ProjectQuerySchema is now defined locally
const ProjectGetSchema = {
  id: z.string().describe('The UUID of the project to retrieve.'),
};

export const getProjectTool = defineTool({
  name: 'get_project',
  description: 'Retrieve details of a specific project in Linear',
  inputSchema: ProjectGetSchema,
  handler: async ({ id }) => {
    const linearClient = getLinearClient();
    try {
      const project = await linearClient.project(id);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(mapProjectToOutput(project)),
          },
        ],
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get project: ${err.message || 'Unknown error'}`,
      );
    }
  },
});
