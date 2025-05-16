// Shared types, mapping, and validation utilities for issues tools

import type {
  Attachment,
  Issue,
  IssuePayload,
  LinearClient,
  Project,
  ProjectMilestone,
  Team,
  User,
  WorkflowState,
} from '@linear/sdk';
import { PaginationOrderBy } from '@linear/sdk/dist/_generated_documents.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

// --- Utility functions to get available entities as JSON for error messages ---
export async function getAvailableTeamsJson(linearClient: LinearClient): Promise<string> {
  try {
    const teams = await linearClient.teams();
    if (!teams.nodes || teams.nodes.length === 0) return '[]';
    return JSON.stringify(
      teams.nodes.map((team) => ({ id: team.id, name: team.name, key: team.key })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch available teams as JSON: ${(e as Error).message})"`;
  }
}
export async function getAvailableProjectsJson(linearClient: LinearClient): Promise<string> {
  try {
    const projects = await linearClient.projects();
    if (!projects.nodes || projects.nodes.length === 0) return '[]';
    return JSON.stringify(
      projects.nodes.map((project) => ({ id: project.id, name: project.name })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch available projects as JSON: ${(e as Error).message})"`;
  }
}
export async function getAvailableStatesJson(linearClient: LinearClient, teamId: string): Promise<string> {
  if (!teamId) return `"(Cannot fetch states without a valid teamId.)"`;
  try {
    const team = await linearClient.team(teamId);
    if (!team)
      return `"(Could not fetch states: Team with ID '${teamId}' not found. Valid teams are: ${await getAvailableTeamsJson(linearClient)})"`;
    const states = await team.states();
    if (!states.nodes || states.nodes.length === 0) return '[]';
    return JSON.stringify(
      states.nodes.map((state) => ({ id: state.id, name: state.name, type: state.type })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch states for team ${teamId} as JSON: ${(e as Error).message})"`;
  }
}
export async function getAvailableAssigneesJson(linearClient: LinearClient): Promise<string> {
  try {
    const users = await linearClient.users({ filter: { active: { eq: true } } });
    if (!users.nodes || users.nodes.length === 0) return '[]';
    return JSON.stringify(
      users.nodes.map((user) => ({ id: user.id, name: user.displayName, email: user.email })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch available assignees as JSON: ${(e as Error).message})"`;
  }
}
export async function getAvailableLabelsJson(linearClient: LinearClient, teamId: string): Promise<string> {
  if (!teamId) return `"(Cannot fetch labels without a valid teamId.)"`;
  try {
    const team = await linearClient.team(teamId);
    if (!team)
      return `"(Could not fetch labels: Team with ID '${teamId}' not found. Valid teams are: ${await getAvailableTeamsJson(linearClient)})"`;
    const labels = await team.labels();
    if (!labels.nodes || labels.nodes.length === 0) return '[]';
    return JSON.stringify(
      labels.nodes.map((label) => ({ id: label.id, name: label.name, color: label.color })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch labels for team ${teamId} as JSON: ${(e as Error).message})"`;
  }
}
export async function getAvailableProjectMilestonesJson(
  linearClient: LinearClient,
  projectId?: string,
): Promise<string> {
  try {
    if (projectId && projectId !== 'any' && projectId.trim() !== '') {
      const project = await linearClient.project(projectId);
      if (!project)
        return `"(Could not fetch milestones: Project with ID '${projectId}' not found. Valid projects are: ${await getAvailableProjectsJson(linearClient)})"`;
      const milestones = await project.projectMilestones();
      if (!milestones.nodes || milestones.nodes.length === 0) return '[]';
      return JSON.stringify(
        milestones.nodes.map((m) => ({ id: m.id, name: m.name })),
        null,
        2,
      );
    }
    return `"(Project milestones are specific to a project. Please provide a valid projectId. Available projects: ${await getAvailableProjectsJson(linearClient)})"`;
  } catch (e) {
    const error = e as Error;
    if (projectId && projectId !== 'any' && error.message.toLowerCase().includes('not found')) {
      return `"(Could not fetch milestones for project '${projectId}': ${error.message}. Valid projects are: ${await getAvailableProjectsJson(linearClient)})"`;
    }
    return `"(Could not fetch project milestones for project ${projectId} as JSON: ${error.message})"`;
  }
}

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
  includeArchived?: boolean;
  first?: number;
};

// --- Mapping ---
export async function mapIssueToDetails(issue: Issue, includeAttachments = false): Promise<SimplifiedIssueDetails> {
  const [state, assignee, team, project, projectMilestone, labelsResult, attachmentsResult] = await Promise.all([
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
    projectMilestone: projectMilestone ? { id: projectMilestone.id, name: projectMilestone.name } : null,
    labels: labelsResult.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color })),
    attachments: includeAttachments && attachmentsResult
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

// --- Validation helpers ---
export async function handleLinearError(
  error: unknown,
  entityType: string,
  entityId: string,
  contextMessage: string,
  getAvailableJsonFn: () => Promise<string> | string,
): Promise<never> {
  if (error instanceof McpError) throw error;
  const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
  const availableJson = typeof getAvailableJsonFn === 'function' ? await getAvailableJsonFn() : getAvailableJsonFn;
  let specificMessage = `Invalid ${entityType}Id: '${entityId}'. ${contextMessage}.`;

  if (err.extensions?.userPresentableMessage) {
    specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
  } else if (err.message) {
    if (
      err.message.toLowerCase().includes('not found') ||
      err.message.toLowerCase().includes('no entity found') ||
      err.message.toLowerCase().includes('api error') ||
      err.message.toLowerCase().includes('invalid uuid')
    ) {
      specificMessage = `${specificMessage} ${entityType} not found or ID is invalid.`;
    } else {
      specificMessage = `${specificMessage} Error during validation: ${err.message}`;
    }
  } else {
    specificMessage = `${specificMessage} An unknown error occurred during ${entityType} validation.`;
  }
  throw new McpError(ErrorCode.InvalidParams, `${specificMessage} Valid ${entityType}s are: ${availableJson}`);
}

export async function validateTeam(linearClient: LinearClient, teamId: string, operationContext = ''): Promise<Team> {
  try {
    const team = await linearClient.team(teamId);
    if (!team) {
      const msg = operationContext ? `${operationContext}: ` : '';
      throw new McpError(ErrorCode.InvalidParams, `${msg}Team with ID '${teamId}' not found. Valid teams are: ${await getAvailableTeamsJson(linearClient)}`);
    }
    return team;
  } catch (e) {
    return handleLinearError(e, 'team', teamId, operationContext, () => getAvailableTeamsJson(linearClient));
  }
}

export async function validateProject(linearClient: LinearClient, projectId: string, operationContext = ''): Promise<Project> {
  try {
    const project = await linearClient.project(projectId);
    if (!project) {
      const msg = operationContext ? `${operationContext}: ` : '';
      throw new McpError(ErrorCode.InvalidParams, `${msg}Project with ID '${projectId}' not found. Valid projects are: ${await getAvailableProjectsJson(linearClient)}`);
    }
    return project;
  } catch (e) {
    return handleLinearError(e, 'project', projectId, operationContext, () => getAvailableProjectsJson(linearClient));
  }
}

export async function validateState(linearClient: LinearClient, teamId: string, stateId: string, operationContext = ''): Promise<WorkflowState> {
  const team = await validateTeam(linearClient, teamId, `for state validation ${operationContext}`);
  try {
    const states = await team.states({ filter: { id: { eq: stateId } } });
    if (!states.nodes || states.nodes.length === 0) {
      const msg = operationContext ? `${operationContext}: ` : '';
      throw new McpError(ErrorCode.InvalidParams, `${msg}State with ID '${stateId}' not found for team '${team.name}'. Valid states are: ${await getAvailableStatesJson(linearClient, teamId)}`);
    }
    return states.nodes[0];
  } catch (e) {
    return handleLinearError(e, 'state', stateId, `for team '${team.name}' ${operationContext}`, () => getAvailableStatesJson(linearClient, teamId));
  }
}

export async function validateAssignee(linearClient: LinearClient, assigneeId: string, operationContext = ''): Promise<User> {
  try {
    const assignee = await linearClient.user(assigneeId);
    if (!assignee || !assignee.active) {
      const msg = operationContext ? `${operationContext}: ` : '';
      let userStatus = 'User not found.';
      if (assignee && !assignee.active) userStatus = `User '${assignee.displayName}' is not active.`;
      throw new McpError(ErrorCode.InvalidParams, `${msg}Assignee with ID '${assigneeId}' is invalid. ${userStatus} Valid assignees are: ${await getAvailableAssigneesJson(linearClient)}`);
    }
    return assignee;
  } catch (e) {
    return handleLinearError(e, 'assignee', assigneeId, operationContext, () => getAvailableAssigneesJson(linearClient));
  }
}

export async function validateLabels(linearClient: LinearClient, teamId: string, labelIds: string[], operationContext = ''): Promise<void> {
  const team = await validateTeam(linearClient, teamId, `for label validation ${operationContext}`);
  try {
    const labels = await team.labels({ filter: { id: { in: labelIds } } });
    const foundLabelIds = labels.nodes.map((l) => l.id);
    const notFoundLabelIds = labelIds.filter((id) => !foundLabelIds.includes(id));
    if (notFoundLabelIds.length > 0) {
      const msg = operationContext ? `${operationContext}: ` : '';
      throw new McpError(ErrorCode.InvalidParams, `${msg}Label(s) with ID(s) '${notFoundLabelIds.join(', ')}' not found for team '${team.name}'. Valid labels are: ${await getAvailableLabelsJson(linearClient, teamId)}`);
    }
  } catch (e) {
    return handleLinearError(e, 'label(s)', labelIds.join(', '), `for team '${team.name}' ${operationContext}`, () => getAvailableLabelsJson(linearClient, teamId));
  }
}

export async function validateProjectMilestone(linearClient: LinearClient, projectMilestoneId: string, forProjectId?: string | null, operationContext = ''): Promise<ProjectMilestone> {
  try {
    const milestone = await linearClient.projectMilestone(projectMilestoneId);
    if (!milestone) {
      const msg = operationContext ? `${operationContext}: ` : '';
      throw new McpError(ErrorCode.InvalidParams, `${msg}Project milestone with ID '${projectMilestoneId}' not found. ${await getAvailableProjectMilestonesJson(linearClient, forProjectId ?? undefined)}`);
    }
    if (forProjectId && milestone.projectId !== forProjectId) {
      const targetProject = await linearClient.project(forProjectId);
      const actualProject = await milestone.project;
      throw new McpError(ErrorCode.InvalidParams, `Project milestone '${milestone.name}' (${projectMilestoneId}) does not belong to project '${targetProject?.name ?? forProjectId}'. It belongs to '${actualProject?.name ?? milestone.projectId}'.`);
    }
    return milestone;
  } catch (e) {
    return handleLinearError(e, 'project milestone', projectMilestoneId, operationContext, () => getAvailableProjectMilestonesJson(linearClient, forProjectId ?? undefined));
  }
}

export async function validateIssueExists(linearClient: LinearClient, issueId: string, operationContext = ''): Promise<Issue> {
  try {
    const issue = await linearClient.issue(issueId);
    if (!issue) {
      let recentIssuesMessage = '';
      try {
        const recentIssues = await linearClient.issues({ first: 5, orderBy: PaginationOrderBy.UpdatedAt });
        if (recentIssues.nodes.length > 0) {
          recentIssuesMessage = ` Recent issues: ${JSON.stringify(recentIssues.nodes.map(iss => ({id: iss.id, title: iss.title, identifier: iss.identifier})), null, 2)}`;
        }
      } catch { /* ignore */ }
      throw new McpError(ErrorCode.InvalidParams, `${operationContext}: Issue with ID '${issueId}' not found.${recentIssuesMessage}`);
    }
    return issue;
  } catch (e) {
    if (e instanceof McpError) throw e;
    throw new McpError(ErrorCode.InternalError, `Error fetching issue '${issueId}' for ${operationContext}: ${(e as Error).message}`);
  }
}