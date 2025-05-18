// TypeScript types for issues module

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