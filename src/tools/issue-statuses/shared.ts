import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';

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
  throw new McpError(
    ErrorCode.InternalError,
    `${message}: ${err.message || 'Unknown error'}`,
  );
}