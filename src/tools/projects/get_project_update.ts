import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';

const GetProjectUpdateSchema = {
  updateId: z.string().describe('The ID of the project update to retrieve'),
};

export const getProjectUpdateTool = defineTool({
  name: 'get_project_update',
  description: 'Get details of a specific project update',
  inputSchema: GetProjectUpdateSchema,
  handler: async ({ updateId }) => {
    try {
      const linearClient = getLinearClient();
      
      // Get the project update
      const update = await linearClient.projectUpdate(updateId);
      if (!update) {
        throw new McpError(ErrorCode.InvalidParams, `Project update with ID '${updateId}' not found.`);
      }

      // Get the project and user information
      const [project, user] = await Promise.all([
        update.project,
        update.user
      ]);

      // Return detailed information about the update
      const updateDetails = {
        id: update.id,
        body: update.body,
        projectId: update.projectId,
        userId: update.userId,
        createdAt: update.createdAt.toISOString(),
        editedAt: update.editedAt?.toISOString() || null,
        archivedAt: update.archivedAt?.toISOString() || null,
        isStale: update.isStale,
        isDiffHidden: update.isDiffHidden,
        diff: update.diff,
        diffMarkdown: update.diffMarkdown,
        url: update.url,
        
        // Related entities
        project: project ? {
          id: project.id,
          name: project.name,
          state: project.state,
          url: project.url
        } : null,
        user: user ? {
          id: user.id,
          name: user.name,
          displayName: user.displayName,
          email: user.email
        } : null,
      };
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(updateDetails)
        }] 
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get project update: ${(error as Error).message || 'Unknown error'}`
      );
    }
  },
}); 