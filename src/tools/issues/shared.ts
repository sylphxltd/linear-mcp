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

// --- Shared types ---
export interface MyIssueOutput {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  state: string | null;
  team: string | null;
  cycleName: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface CommentOutput {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
}

export interface IssueGitBranchOutput {
  id: string;
  identifier: string;
  title: string;
  branchName: string;
}

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
  // Core filters
  filter?: Record<string, unknown>; // For complex query filters
  teamId?: string;
  assigneeId?: string;
  stateId?: string;
  
  // Project-related filters
  projectId?: string;
  projectMilestoneId?: string;

  // Pagination and display
  first?: number;
  includeArchived?: boolean;
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

export async function mapToMyIssueOutput(issue: Issue): Promise<MyIssueOutput> {
  const state = issue.state ? await issue.state : null;
  const team = issue.team ? await issue.team : null;
  const cycle = issue.cycle ? await issue.cycle : null;

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? null,
    priority: issue.priority,
    state: state?.name ?? null,
    team: team?.name ?? null,
    cycleName: cycle?.name ?? null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    url: issue.url,
  };
}

// --- Comment mappers ---
import type { Comment } from '@linear/sdk';

export function mapCommentToOutput(comment: Comment): CommentOutput {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    userId: comment.userId ?? null,
  };
}

// --- Git branch mappers ---
export async function mapIssueToGitBranch(issue: Issue): Promise<IssueGitBranchOutput> {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    branchName: await issue.branchName,
  };
}
