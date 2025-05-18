import type { LinearClient } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// --- Tool definition utility (local copy) ---

// --- Project schemas (local copy) ---
export const ProjectFilterSchema = {
  limit: z.number().default(50).describe('The number of items to return'),
  before: z.string().optional().describe('A UUID to end at'),
  after: z.string().optional().describe('A UUID to start from'),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt'),
  includeArchived: z.boolean().default(false).describe('Whether to include archived projects'),
  teamId: z.string().optional().describe('A team UUID to filter by'),
};
export const ProjectQuerySchema = {
  query: z.string().describe('The ID or name of the project to retrieve'),
};
export const ProjectCreateSchema = {
  name: z.string().describe('A descriptive name of the project'),
  description: z.string().optional().describe('The description of the project as Markdown'),
  content: z.string().optional().describe('The content of the project as Markdown'),
  startDate: z.string().optional().describe('The start date of the project in ISO format'),
  targetDate: z.string().optional().describe('The target date of the project in ISO format'),
  teamIds: z.array(z.string()).describe('The UUIDs of the teams to associate the project with'),
};
export const ProjectUpdateSchema = {
  id: z.string().describe('The ID of the project to update'),
  name: z.string().optional().describe('The new name of the project'),
  description: z.string().optional().describe('The new description of the project as Markdown'),
  content: z.string().optional().describe('The content of the project as Markdown'),
  startDate: z.string().optional().describe('The start date of the project in ISO format'),
  targetDate: z.string().optional().describe('The target date of the project in ISO format'),
  teamIds: z
    .array(z.string())
    .optional()
    .describe('The UUIDs of the teams to associate the project with'),
};
// Project input types
export type ProjectInput = {
  name: string;
  teamIds: string[];
  description?: string;
  content?: string;
  startDate?: string;
  targetDate?: string;
};

export type ProjectUpdateInput = {
  name?: string;
  description?: string;
  content?: string;
  startDate?: string;
  targetDate?: string;
};
