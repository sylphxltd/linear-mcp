// Zod schemas for issues module

import { z } from 'zod';

export const IdSchema = {
  id: z.string().describe('The issue ID'),
};
export const PaginationSchema = {
  limit: z.number().default(50).describe('The number of items to return'),
  before: z.string().optional().describe('A UUID to end at'),
  after: z.string().optional().describe('A UUID to start from'),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt'),
};

export const IssueFilterSchema = {
  query: z.string().optional().describe('An optional search query'),
  teamId: z.string().optional().describe('The team UUID'),
  stateId: z.string().optional().describe('The state UUID'),
  assigneeId: z.string().optional().describe('The assignee UUID'),
  projectMilestoneId: z
    .string()
    .uuid('Invalid project milestone ID')
    .optional()
    .describe('The project milestone ID to filter by'),
  includeArchived: z.boolean().default(true).describe('Whether to include archived issues'),
  limit: z.number().default(50).describe('The number of issues to return'),
  projectId: z.string().optional().describe('The project ID to filter by'),
};

export const IssueCreateSchema = {
  title: z.string().describe('The issue title'),
  description: z.string().optional().describe('The issue description as Markdown'),
  teamId: z.string().describe('The team UUID'),
  priority: z
    .number()
    .optional()
    .describe('The issue priority. 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low.'),
  projectId: z.string().optional().describe('The project ID to add the issue to'),
  stateId: z.string().optional().describe('The issue state ID'),
  assigneeId: z.string().optional().describe('The assignee ID'),
  labelIds: z.array(z.string()).optional().describe('Array of label IDs to set on the issue'),
  dueDate: z.string().optional().describe('The due date for the issue in ISO format'),
  projectMilestoneId: z
    .string()
    .uuid('Invalid project milestone ID')
    .optional()
    .describe('The project milestone ID to associate the issue with'),
};

export const IssueUpdateSchema = {
  id: z.string().describe('The issue ID'),
  title: z.string().optional().describe('The issue title'),
  description: z.string().optional().describe('The issue description as Markdown'),
  priority: z
    .number()
    .optional()
    .describe('The issue priority. 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low.'),
  projectId: z.string().optional().describe('The project ID to add the issue to'),
  stateId: z.string().optional().describe('The issue state ID'),
  assigneeId: z.string().optional().describe('The assignee ID'),
  labelIds: z.array(z.string()).optional().describe('Array of label IDs to set on the issue'),
  dueDate: z.string().optional().describe('The due date for the issue in ISO format'),
  projectMilestoneId: z
    .string()
    .uuid('Invalid project milestone ID')
    .nullable()
    .optional()
    .describe('The project milestone ID to associate the issue with (null to remove)'),
};

export const CommentCreateSchema = {
  issueId: z.string().describe('The issue ID'),
  body: z.string().describe('The content of the comment as Markdown'),
};