import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapProjectToOutput } from './shared.js';

const ProjectUpdateSchema = {
  id: z.string().describe('The UUID of the project to update.'),
  name: z.string().optional().describe('The new name of the project.'),
  description: z.string().optional().describe('The new description of the project in Markdown.'),
  content: z.string().optional().describe('The new content of the project in Markdown.'),
  startDate: z.string().optional().describe('The new start date of the project in ISO format.'),
  targetDate: z.string().optional().describe('The new target date of the project in ISO format.'),
  teamIds: z.array(z.string()).optional().describe('Array of team UUIDs to associate the project with.'),
};

export const updateProjectTool = defineTool({
  name: 'update_project',
  description: 'Update an existing Linear project',
  inputSchema: ProjectUpdateSchema,
  handler: async ({ id, name, description, content, startDate, targetDate, teamIds }) => {
    const linearClient = getLinearClient();
    const projectInput = {
      name,
      description,
      content,
      startDate,
      targetDate,
      ...(teamIds !== undefined ? { teamIds } : {}),
    };
    const projectPayload = await linearClient.updateProject(id, projectInput);
    if (!projectPayload.project) {
      throw new McpError(ErrorCode.InternalError, 'Failed to update project: No project returned');
    }
    const project = await projectPayload.project;
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mapProjectToOutput(project)),
        },
      ],
    };
  },
});
