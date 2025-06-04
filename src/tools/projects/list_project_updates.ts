import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';

const ListProjectUpdatesSchema = {
  projectId: z.string().describe('The ID of the project to list updates for'),
  includeArchived: z.boolean().default(false).describe('Whether to include archived updates'),
  limit: z.number().min(1).max(100).default(20).describe('Maximum number of updates to return'),
};

export const listProjectUpdatesTool = defineTool({
  name: 'list_project_updates',
  description: 'List updates for a given project',
  inputSchema: ListProjectUpdatesSchema,
  handler: async ({ projectId, includeArchived, limit }) => {
    try {
      const linearClient = getLinearClient();
      
      // Get the project first to verify it exists
      const project = await linearClient.project(projectId);
      if (!project) {
        throw new McpError(ErrorCode.InvalidParams, `Project with ID '${projectId}' not found.`);
      }

      // Get the project updates
      const projectUpdatesConnection = await project.projectUpdates({
        includeArchived,
        first: limit,
      });
      
      const updates = projectUpdatesConnection.nodes.map(update => ({
        id: update.id,
        body: update.body,
        createdAt: update.createdAt.toISOString(),
        editedAt: update.editedAt?.toISOString() || null,
        userId: update.userId,
        projectId: update.projectId,
        isStale: update.isStale,
        isDiffHidden: update.isDiffHidden,
        diff: update.diff,
        diffMarkdown: update.diffMarkdown,
        archivedAt: update.archivedAt?.toISOString() || null,
        url: update.url,
      }));
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            projectId,
            projectName: project.name,
            projectState: project.state,
            updates,
            totalCount: updates.length,
            hasNextPage: projectUpdatesConnection.pageInfo.hasNextPage,
          })
        }] 
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list project updates: ${(error as Error).message || 'Unknown error'}`
      );
    }
  },
}); 