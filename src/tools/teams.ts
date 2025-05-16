export { listTeamsTool } from './teams/list_teams.js';
export { getTeamTool } from './teams/get_team.js';

export const teamTools = {
  listTeamsTool: (await import('./teams/list_teams.js')).listTeamsTool,
  getTeamTool: (await import('./teams/get_team.js')).getTeamTool,
};
