import type { Team } from '@linear/sdk';
import type { LinearClient } from '@linear/sdk';

/**
 * Fetches a message listing all available teams, or a fallback message if none found.
 */
export async function getAvailableTeamsMessage(linearClient: LinearClient): Promise<string> {
  try {
    const allTeams = await linearClient.teams();
    if (allTeams.nodes.length > 0) {
      const teamList = allTeams.nodes.map((t: Team) => ({
        id: t.id,
        name: t.name,
      }));
      return ` Valid teams are: ${JSON.stringify(teamList, null, 2)}`;
    }
    return ' No teams available to list.';
  } catch {
    return ' (Could not fetch available teams for context.)';
  }
}

/**
 * Formats an array of label nodes for output.
 */
export function formatLabelNodes(
  labels: { [key: string]: any }[],
): object[] {
  return labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description,
    createdAt:
      label.createdAt instanceof Date
        ? label.createdAt.toISOString()
        : typeof label.createdAt === 'string'
        ? label.createdAt
        : undefined,
    updatedAt:
      label.updatedAt instanceof Date
        ? label.updatedAt.toISOString()
        : typeof label.updatedAt === 'string'
        ? label.updatedAt
        : undefined,
  }));
}