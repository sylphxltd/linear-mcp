import type { LinearClient, Project, ProjectMilestone } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// --- Tool definition utility (local copy) ---
export interface ToolDefinition<T extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  inputSchema: T;
  handler: import('@modelcontextprotocol/sdk/server/mcp.js').ToolCallback<T>;
}
export const defineTool = <T extends z.ZodRawShape>(
  tool: ToolDefinition<T>,
): ToolDefinition<T> => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  handler: tool.handler,
});

// --- Project Milestone schemas (local copy) ---
export const ListProjectMilestonesInputSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});
export const CreateProjectMilestoneInputSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  name: z.string().min(1, 'Milestone name cannot be empty'),
  description: z.string().optional(),
  targetDate: z.string().datetime({ message: 'Invalid ISO date string for targetDate' }).optional(),
});
export const UpdateProjectMilestoneInputSchema = z.object({
  milestoneId: z.string().uuid('Invalid milestone ID'),
  name: z.string().min(1, 'Milestone name cannot be empty').optional(),
  description: z.string().optional(),
  targetDate: z.string().datetime({ message: 'Invalid ISO date string for targetDate' }).optional(),
});
export const DeleteProjectMilestoneInputSchema = z.object({
  milestoneId: z.string().uuid('Invalid milestone ID'),
});

// Helper function to get available projects for error messages
export async function getAvailableProjectsJsonForError(
  linearClient: LinearClient,
): Promise<string> {
  try {
    const projects = await linearClient.projects();
    if (!projects.nodes || projects.nodes.length === 0) {
      return '[]';
    }
    const projectList = projects.nodes.map((p) => ({ id: p.id, name: p.name }));
    return JSON.stringify(projectList, null, 2);
  } catch (e) {
    const error = e as Error;
    return `(Could not fetch available projects for context: ${error.message})`;
  }
}
