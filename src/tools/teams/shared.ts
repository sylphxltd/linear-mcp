import type { Team } from '@linear/sdk';
import type { LinearClient } from '@linear/sdk';

export interface TeamOutput {
  id: string;
  name: string;
  key: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export function mapTeamToOutput(team: Team): TeamOutput {
  return {
    id: team.id,
    name: team.name,
    key: team.key,
    description: team.description ?? null,
    color: team.color ?? null,
    icon: team.icon ?? null,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

export async function getAvailableTeamsMessage(linearClient: LinearClient): Promise<string> {
  try {
    const allTeams = await linearClient.teams();
    if (allTeams.nodes.length > 0) {
      const teamList = allTeams.nodes.map(mapTeamToOutput);
      return ` Valid teams are: ${JSON.stringify(teamList, null, 2)}`;
    }
    return ' No teams available to list.';
  } catch (error) {
    const err = error as Error;
    return ` (Could not fetch available teams for context: ${err.message})`;
  }
}