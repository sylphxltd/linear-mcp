import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { defineTool } from '../shared/tool-definition.js';
import { z } from 'zod';
import { mapProjectToOutput } from './shared.js';

const ProjectCreateSchema = {
  name: z.string().describe('The name of the project.'),
  description: z.string().optional().describe('The description of the project in Markdown.'),
  content: z.string().optional().describe('The content of the project in Markdown.'),
  startDate: z.string().optional().describe('The start date of the project in ISO format.'),
  targetDate: z.string().optional().describe('The target date of the project in ISO format.'),
  teamIds: z.array(z.string()).describe('Array of team UUIDs to associate the project with.'),
};

export const createProjectTool = defineTool({
  name: 'create_project',
  description: 'Create a new project in Linear',
  inputSchema: ProjectCreateSchema,
  handler: async ({ name, description, content, startDate, targetDate, teamIds }) => {
    const linearClient = getLinearClient();
    const projectInput = {
      name,
      teamIds,
      description,
      content,
      startDate,
      targetDate,
    };
    const projectPayload = await linearClient.createProject(projectInput);
    if (!projectPayload.project) {
      throw new McpError(ErrorCode.InternalError, 'Failed to create project: No project returned');
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
