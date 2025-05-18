import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { LinearDocument } from '@linear/sdk';
import { mapProjectToOutput } from './shared.js';


const ProjectFilterSchema = {
  limit: z.number().default(50).describe('The maximum number of projects to return.'),
  before: z.string().optional().describe('A project UUID to end at (for pagination).'),
  after: z.string().optional().describe('A project UUID to start from (for pagination).'),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt').describe('The field to order results by.'),
  includeArchived: z.boolean().default(false).describe('Whether to include archived projects.'),
  teamId: z.string().optional().describe('The UUID of the team to filter projects by.'),
};

export const listProjectsTool = defineTool({
  name: 'list_projects',
  description: "List projects in the user's Linear workspace",
  inputSchema: ProjectFilterSchema,
  handler: async ({ limit, before, after, includeArchived, teamId, orderBy }) => {
    const linearClient = getLinearClient();
    const projectsConnection = await linearClient.projects({
      first: limit,
      includeArchived,
      ...(teamId ? { teamId } : {}),
      ...(before ? { before } : {}),
      ...(after ? { after } : {}),
      orderBy: orderBy === 'createdAt' ? LinearDocument.PaginationOrderBy.CreatedAt : LinearDocument.PaginationOrderBy.UpdatedAt,
    });
    const projects = projectsConnection.nodes.map(mapProjectToOutput);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projects),
        },
      ],
    };
  },
});
