import {
  type Attachment,
  type Issue,
  type IssuePayload,
  type LinearClient,
  LinearDocument,
  type Project,
  type ProjectMilestone,
  type Team,
  type User,
  type WorkflowState,
} from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
// Shared types, mapping, and validation utilities for issues tools
import { z } from 'zod';

// --- Tool definition utility (local copy) ---

// --- Common schemas (local copy) ---
export const IdSchema = {
  id: z.string().describe('The issue ID'),
};
export const PaginationSchema = {
  limit: z.number().default(50).describe('The number of items to return'),
  before: z.string().optional().describe('A UUID to end at'),
  after: z.string().optional().describe('A UUID to start from'),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('updatedAt'),
};

// --- Issue schemas (local copy) ---
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

// --- Shared types ---
export interface SimplifiedIssueDetails {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  priority: number;
  state?: { id: string; name: string; color: string; type: string } | null;
  assignee?: { id: string; name: string; email?: string | null } | null;
  team?: { id: string; name: string; key: string } | null;
  project?: { id: string; name: string } | null;
  projectMilestone?: { id: string; name: string } | null;
  labels?: { id: string; name: string; color: string }[];
  attachments?: {
    id: string;
    title: string;
    url: string;
    source?: unknown;
    metadata?: unknown;
    groupBySource?: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  url: string;
}

export type IssueFilters = {
  filter?: Record<string, unknown>;
  teamId?: string;
  stateId?: string;
  assigneeId?: string;
  projectId?: string;
  includeArchived?: boolean;
  first?: number;
};

// --- Mapping ---
export async function mapIssueToDetails(
  issue: Issue,
  includeAttachments = false,
): Promise<SimplifiedIssueDetails> {
  const [state, assignee, team, project, projectMilestone, labelsResult, attachmentsResult] =
    await Promise.all([
      issue.state,
      issue.assignee,
      issue.team,
      issue.project,
      issue.projectMilestone,
      issue.labels(),
      includeAttachments ? issue.attachments() : Promise.resolve(null),
    ]);

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description,
    priority: issue.priority,
    state: state ? { id: state.id, name: state.name, color: state.color, type: state.type } : null,
    assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : null,
    team: team ? { id: team.id, name: team.name, key: team.key } : null,
    project: project ? { id: project.id, name: project.name } : null,
    projectMilestone: projectMilestone
      ? { id: projectMilestone.id, name: projectMilestone.name }
      : null,
    labels: labelsResult.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color })),
    attachments:
      includeAttachments && attachmentsResult
        ? attachmentsResult.nodes.map((att: Attachment) => ({
            id: att.id,
            title: att.title,
            url: att.url,
            source: att.source,
            metadata: att.metadata,
            groupBySource: att.groupBySource,
            createdAt: att.createdAt,
            updatedAt: att.updatedAt,
          }))
        : undefined,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    url: issue.url,
  };
}
