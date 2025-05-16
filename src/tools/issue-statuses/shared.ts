import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';

// --- Tool definition utility (local copy) ---

// --- Issue Status schemas (local copy) ---
export const IssueStatusListSchema = {
  teamId: z.string().describe('The team UUID'),
};
export const IssueStatusQuerySchema = {
  query: z.string().describe('The UUID or name of the issue status to retrieve'),
  teamId: z.string().describe('The team UUID'),
};

export async function validateTeamOrThrow(teamId: string) {
  const linearClient = getLinearClient();
  const team = await linearClient.team(teamId);
  if (!team) {
    let availableTeamsMessage = '';
    try {
      const allTeams = await linearClient.teams();
      if (allTeams.nodes.length > 0) {
        const teamList = allTeams.nodes.map((t) => ({
          id: t.id,
          name: t.name,
        }));
        availableTeamsMessage = ` Valid teams are: ${JSON.stringify(teamList, null, 2)}`;
      } else {
        availableTeamsMessage = ' No teams available to list.';
      }
    } catch (_listError) {
      availableTeamsMessage = ' (Could not fetch available teams for context.)';
    }
    throw new McpError(
      ErrorCode.InvalidParams,
      `Team with ID '${teamId}' not found.${availableTeamsMessage}`,
    );
  }
  return team;
}

export function throwInternalError(message: string, error: unknown): never {
  const err = error as { message?: string };
  throw new McpError(ErrorCode.InternalError, `${message}: ${err.message || 'Unknown error'}`);
}
