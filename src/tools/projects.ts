import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../utils/linear-client.js';
import {
  defineTool,
  ProjectFilterSchema,
  ProjectQuerySchema,
  ProjectCreateSchema,
  ProjectUpdateSchema
} from '../schemas/index.js';

// Define proper types for the Linear API
type ProjectFilters = {
  first?: number;
  includeArchived?: boolean;
  before?: string;
  after?: string;
  teamId?: string;
};

type ProjectInput = {
  name: string;
  teamIds: string[];
  description?: string;
  content?: string;
  startDate?: string;
  targetDate?: string;
};

type ProjectUpdateInput = {
  name?: string;
  description?: string;
  content?: string;
  startDate?: string;
  targetDate?: string;
};

export const listProjectsTool = defineTool({
  name: 'list_projects',
  description: 'List projects in the user\'s Linear workspace',
  inputSchema: ProjectFilterSchema,
  handler: async (args) => {
    try {
      const { limit, before, after, includeArchived, teamId } = args;
      // Remove orderBy for compatibility
      const filters: Record<string, unknown> = {
        first: limit,
        includeArchived,
        teamId,
      };
      if (before) filters.before = before;
      if (after) filters.after = after;
      const linearClient = getLinearClient();
      const projectsConnection = await linearClient.projects(filters);
      const projects = await Promise.all(
        projectsConnection.nodes.map(async (projectFetch) => {
          const project = await projectFetch;
          return {
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
          };
        })
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projects),
          },
        ],
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list projects: ${err.message || 'Unknown error'}`
      );
    }
  },
});

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
    } catch (error: unknown) {
      // continue to search by name
    }
    try {
      const projectsConnection = await linearClient.projects({
        filter: {
          name: { eq: query },
        },
      });
      if (projectsConnection.nodes.length > 0) {
        const project = await projectsConnection.nodes[0];
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
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get project: ${err.message || 'Unknown error'}`
      );
    }
    throw new McpError(ErrorCode.MethodNotFound, `Project with ID or name "${query}" not found`);
  },
});

export const createProjectTool = defineTool({
  name: 'create_project',
  description: 'Create a new project in Linear',
  inputSchema: ProjectCreateSchema,
  handler: async (args) => {
    try {
      const { name, description, content, startDate, targetDate, teamIds } = args;
      const projectInput: ProjectInput = {
        name,
        teamIds,
        description,
        content,
        startDate,
        targetDate,
      };
      const linearClient = getLinearClient();
      const projectPayload = await linearClient.createProject(projectInput);
      if (projectPayload.project) {
        const project = await projectPayload.project;
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
      throw new McpError(ErrorCode.InternalError, 'Failed to create project: No project returned');
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create project: ${err.message || 'Unknown error'}`
      );
    }
  },
});

export const updateProjectTool = defineTool({
  name: 'update_project',
  description: 'Update an existing Linear project',
  inputSchema: ProjectUpdateSchema,
  handler: async (args) => {
    try {
      const { id, name, description, content, startDate, targetDate } = args;
      const projectInput: ProjectUpdateInput = {
        name,
        description,
        content,
        startDate,
        targetDate,
      };
      const linearClient = getLinearClient();
      const projectPayload = await linearClient.updateProject(id, projectInput);
      if (projectPayload.project) {
        const project = await projectPayload.project;
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
      throw new McpError(ErrorCode.InternalError, 'Failed to update project: No project returned');
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update project: ${err.message || 'Unknown error'}`
      );
    }
  },
});

export const projectTools = {
  listProjectsTool,
  getProjectTool,
  createProjectTool,
  updateProjectTool,
};