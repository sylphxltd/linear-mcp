import type { LinearClient } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

// Helper: Get available teams as JSON
export async function getAvailableTeamsJson(linearClient: LinearClient): Promise<string> {
  try {
    const teams = await linearClient.teams();
    if (!teams.nodes || teams.nodes.length === 0) {
      return '[]';
    }
    const teamList = teams.nodes.map((team) => ({
      id: team.id,
      name: team.name,
    }));
    return JSON.stringify(teamList, null, 2);
  } catch (e) {
    const error = e as Error;
    return `"(Could not fetch available teams as JSON: ${error.message})"`;
  }
}

// Helper: Get available projects as JSON
export async function getAvailableProjectsJson(linearClient: LinearClient): Promise<string> {
  try {
    const projects = await linearClient.projects();
    if (!projects.nodes || projects.nodes.length === 0) {
      return '[]';
    }
    const projectList = projects.nodes.map((project) => ({
      id: project.id,
      name: project.name,
    }));
    return JSON.stringify(projectList, null, 2);
  } catch (e) {
    const error = e as Error;
    return `"(Could not fetch available projects as JSON: ${error.message})"`;
  }
}

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

// Validate teamId
export async function validateTeamIdOrThrow(linearClient: LinearClient, teamId: string): Promise<void> {
  try {
    const team = await linearClient.team(teamId);
    if (!team) {
      const availableTeamsJsonString = await getAvailableTeamsJson(linearClient);
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid teamId: '${teamId}'. Team not found. Valid teams are: ${availableTeamsJsonString}`,
      );
    }
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      extensions?: { userPresentableMessage?: string };
    };
    const availableTeamsJsonString = await getAvailableTeamsJson(linearClient);
    let specificMessage = `Invalid teamId: '${teamId}'.`;
    if (err.extensions?.userPresentableMessage) {
      specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
    } else if (err.message) {
      if (
        err.message.toLowerCase().includes('not found') ||
        err.message.toLowerCase().includes('no entity found') ||
        err.message.toLowerCase().includes('api error') ||
        err.message.toLowerCase().includes('invalid uuid')
      ) {
        specificMessage = `${specificMessage} Team not found or ID is invalid.`;
      } else {
        specificMessage = `${specificMessage} Error during validation: ${err.message}`;
      }
    } else {
      specificMessage = `${specificMessage} An unknown error occurred during team validation.`;
    }
    throw new McpError(
      ErrorCode.InvalidParams,
      `${specificMessage} Valid teams are: ${availableTeamsJsonString}`,
    );
  }
}
async function assertValidProjectId(
  linearClient: LinearClient,
  projectId: string,
): Promise<void> {
  try {
    const projectToUpdate = await linearClient.project(projectId);
    if (!projectToUpdate) {
      const availableProjectsJsonString = await getAvailableProjectsJson(linearClient);
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid project id: '${projectId}'. Project not found. Valid projects are: ${availableProjectsJsonString}`,
      );
    }
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      extensions?: { userPresentableMessage?: string };
    };
    const availableProjectsJsonString = await getAvailableProjectsJson(linearClient);
    let specificMessage = `Invalid project id: '${projectId}'.`;
    if (err.extensions?.userPresentableMessage) {
      specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
    } else if (err.message) {
      if (
        err.message.toLowerCase().includes('not found') ||
        err.message.toLowerCase().includes('no entity found') ||
        err.message.toLowerCase().includes('api error') ||
        err.message.toLowerCase().includes('invalid uuid')
      ) {
        specificMessage = `${specificMessage} Project not found or ID is invalid.`;
      } else {
        specificMessage = `${specificMessage} Error during validation: ${err.message}`;
      }
    } else {
      specificMessage = `${specificMessage} An unknown error occurred during project validation.`;
    }
    throw new McpError(
      ErrorCode.InvalidParams,
      `${specificMessage} Valid projects are: ${availableProjectsJsonString}`,
    );
  }
}

async function assertValidTeamIds(
  linearClient: LinearClient,
  teamIds?: string[],
): Promise<void> {
  if (teamIds && teamIds.length > 0) {
    const availableTeams = await linearClient.teams();
    const validTeamIds = availableTeams.nodes.map((team) => team.id);
    const invalidTeamIds = teamIds.filter((teamId) => !validTeamIds.includes(teamId));
    if (invalidTeamIds.length > 0) {
      const availableTeamsJsonString = await getAvailableTeamsJson(linearClient);
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid teamId(s): '${invalidTeamIds.join(', ')}'. Team(s) not found. Valid teams are: ${availableTeamsJsonString}`,
      );
    }
  }
}

// Validate project update args
export async function validateProjectUpdateArgsOrThrow(
  linearClient: LinearClient,
  projectId: string,
  teamIds?: string[],
): Promise<void> {
  await assertValidProjectId(linearClient, projectId);
  await assertValidTeamIds(linearClient, teamIds);
}