import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  isEntityError,
  getAvailableProjectsJson,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { ProjectQuerySchema } from './shared.js';

export const getProjectTool = defineTool({
  name: 'get_project',
  description: 'Retrieve details of a specific project in Linear',
  inputSchema: ProjectQuerySchema,
  handler: async ({ query }) => {
    const linearClient = getLinearClient();
    try {
      const projectFetch = await linearClient.project(query);
      if (projectFetch) {
        const project = await projectFetch;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: project.id,
                name: project.name,
                description: project.description,
                content: project.content,
                icon: project.icon,
                color: project.color,
                state: project.state,
                startDate: project.startDate,
                targetDate: project.targetDate,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                url: project.url,
              }),
            },
          ],
        };
      }
    } catch (idError: unknown) {
      const idErr = idError as Error;
      if (isEntityError(idErr.message)) {
        // If it's a known entity error (e.g. "projectId must be a UUID"), throw it with context.
        const availableProjects = await getAvailableProjectsJson(linearClient);
        throw new Error(`${idErr.message}\nAvailable projects: ${availableProjects}`);
      }
      // If not an entity error (e.g. network issue) or if it's a non-UUID query,
      // we allow it to proceed to search by name.
      // We don't rethrow here to allow the name search fallback.
    }

    // Try to find by name if not found by ID or if query wasn't a valid ID format
    try {
      const projectsConnection = await linearClient.projects({
        filter: { name: { eqIgnoreCase: query } }, // Using eqIgnoreCase for better name matching
      });

      if (projectsConnection.nodes.length > 0) {
        const project = projectsConnection.nodes[0];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: project.id,
                name: project.name,
                description: project.description,
                content: project.content,
                icon: project.icon,
                color: project.color,
                state: project.state,
                startDate: project.startDate,
                targetDate: project.targetDate,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                url: project.url,
              }),
            },
          ],
        };
      }
    } catch (nameError: unknown) {
      // This catch is for errors during the name search itself (e.g., network error)
      if (nameError instanceof McpError) throw nameError;
      const err = nameError as Error;
      // isEntityError might not be relevant here unless the name search itself can cause entity-specific errors
      throw new McpError(
        ErrorCode.InternalError,
        `Error searching projects by name "${query}": ${err.message || 'Unknown error'}`,
      );
    }

    // If project not found by ID or name, throw an error with available projects.
    // This is the final "not found" case.
    try {
      const availableProjects = await getAvailableProjectsJson(linearClient);
      // Construct a message that is likely to be caught by isEntityError if patterns match "not found"
      const notFoundMessage = `Entity not found: Project - Could not find referenced Project with query "${query}".`;
      if (isEntityError(notFoundMessage)) { // Check if our constructed message would be an entity error
        throw new Error(`${notFoundMessage}\nAvailable projects: ${availableProjects}`);
      }
      // Fallback to McpError if our specific "not found" message isn't an entity error by pattern
      throw new McpError(
        ErrorCode.InvalidParams, // Or NotFound if that existed and was appropriate
        `Project with query "${query}" not found. Valid projects are: ${availableProjects}`,
      );
    } catch (finalError: unknown) {
      // This catches errors from getAvailableProjectsJson or the re-thrown error from above
      if (finalError instanceof McpError || finalError instanceof Error) throw finalError;
      throw new McpError(
        ErrorCode.InternalError,
        `Project with query "${query}" not found, and failed to list available projects: ${String(finalError)}`,
      );
    }
  },
});
