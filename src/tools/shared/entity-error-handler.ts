/**
 * Shared error handler for entity-related errors (projectId, teamId, teamIds, labelIds, etc).
 */

export function isEntityError(message: string): boolean {
  if (!message) {
    return false;
  }
  const patterns = [
    /^Argument Validation Error - projectId must be a UUID\.$/,
    /^Argument Validation Error - each value in teamIds must be a UUID\.$/,
    /^Entity not found: Project - Could not find referenced Project\.$/,
    /^Entity not found: Team - Could not find referenced Team\.$/,
    /^Entity not found: Team: teamIds contained an entry that could not be found\.$/,
    /^Argument Validation Error - each value in labelIds must be a UUID\.$/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(message)) {
      return true;
    }
  }
  return false;
}

// --- Available list helpers (moved from issues/shared.ts) ---

export async function getAvailableTeamsJson(linearClient: any): Promise<string> {
  try {
    const teams = await linearClient.teams();
    if (!teams.nodes || teams.nodes.length === 0) return '[]';
    return JSON.stringify(
      teams.nodes.map((team: any) => ({ id: team.id, name: team.name, key: team.key })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch available teams as JSON: ${(e as Error).message})"`;
  }
}

export async function getAvailableProjectsJson(linearClient: any): Promise<string> {
  try {
    const projects = await linearClient.projects();
    if (!projects.nodes || projects.nodes.length === 0) return '[]';
    return JSON.stringify(
      projects.nodes.map((project: any) => ({ id: project.id, name: project.name })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch available projects as JSON: ${(e as Error).message})"`;
  }
}

export async function getAvailableStatesJson(
  linearClient: any,
  context: { teamId?: string },
): Promise<string> {
  const teamId = context?.teamId;
  if (!teamId) return `"(Cannot fetch states without a valid teamId in context.)"`;
  try {
    const team = await linearClient.team(teamId);
    if (!team)
      return `"(Could not fetch states: Team with ID '${teamId}' not found. Valid teams are: ${await getAvailableTeamsJson(linearClient)})"`;
    const states = await team.states();
    if (!states.nodes || states.nodes.length === 0) return '[]';
    return JSON.stringify(
      states.nodes.map((state: any) => ({ id: state.id, name: state.name, type: state.type })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch states for team ${teamId} as JSON: ${(e as Error).message})"`;
  }
}

export async function getAvailableAssigneesJson(linearClient: any): Promise<string> {
  try {
    const users = await linearClient.users({ filter: { active: { eq: true } } });
    if (!users.nodes || users.nodes.length === 0) return '[]';
    return JSON.stringify(
      users.nodes.map((user: any) => ({ id: user.id, name: user.displayName, email: user.email })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch available assignees as JSON: ${(e as Error).message})"`;
  }
}

export async function getAvailableLabelsJson(
  linearClient: any,
  context: { teamId?: string },
): Promise<string> {
  const teamId = context?.teamId;
  if (!teamId) return `"(Cannot fetch labels without a valid teamId in context.)"`;
  try {
    const team = await linearClient.team(teamId);
    if (!team)
      return `"(Could not fetch labels: Team with ID '${teamId}' not found. Valid teams are: ${await getAvailableTeamsJson(linearClient)})"`;
    const labels = await team.labels();
    if (!labels.nodes || labels.nodes.length === 0) return '[]';
    return JSON.stringify(
      labels.nodes.map((label: any) => ({ id: label.id, name: label.name, color: label.color })),
      null,
      2,
    );
  } catch (e) {
    return `"(Could not fetch labels for team ${teamId} as JSON: ${(e as Error).message})"`;
  }
}

export async function getAvailableProjectMilestonesJson(
  linearClient: any,
  context?: { projectId?: string },
): Promise<string> {
  const projectId = context?.projectId;
  try {
    if (projectId && projectId !== 'any' && projectId.trim() !== '') {
      const project = await linearClient.project(projectId);
      if (!project)
        return `"(Could not fetch milestones: Project with ID '${projectId}' not found. Valid projects are: ${await getAvailableProjectsJson(linearClient)})"`;
      const milestones = await project.projectMilestones();
      if (!milestones.nodes || milestones.nodes.length === 0) return '[]';
      return JSON.stringify(
        milestones.nodes.map((m: any) => ({ id: m.id, name: m.name })),
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