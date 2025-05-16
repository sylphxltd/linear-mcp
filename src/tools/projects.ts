import type { LinearClient, Project, Team } from "@linear/sdk"; // Import LinearClient, Project, and Team types
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
	ProjectCreateSchema,
	ProjectFilterSchema,
	ProjectQuerySchema,
	ProjectUpdateSchema,
	defineTool,
} from "../schemas/index.js";
import { getLinearClient } from "../utils/linear-client.js";

async function getAvailableTeamsMessage(linearClient: LinearClient): Promise<string> {
  try {
    const teams = await linearClient.teams();
    if (!teams.nodes || teams.nodes.length === 0) {
      return " No teams available to list."; // Leading space for concat
    }
    const teamList = teams.nodes
      .map((team) => `  - ${team.id}: ${team.name}`)
      .join("\n");
    return `\nAvailable teams:\n${teamList}`;
  } catch (e) {
    console.error("Failed to fetch available teams for error message:", e);
    return "\n(Could not fetch available teams due to an internal error.)";
  }
}

async function getAvailableProjectsMessage(linearClient: LinearClient): Promise<string> {
  try {
    const projects = await linearClient.projects(); // Assuming no complex filtering needed for listing
    if (!projects.nodes || projects.nodes.length === 0) {
      return " No projects available to list."; // Leading space for concat
    }
    const projectList = projects.nodes
      .map((project) => `  - ${project.id}: ${project.name}`)
      .join("\n");
    return `\nAvailable projects:\n${projectList}`;
  } catch (e) {
    console.error("Failed to fetch available projects for error message:", e);
    return "\n(Could not fetch available projects due to an internal error.)";
     }
   }
   
   // New helper function for teams as JSON
   async function getAvailableTeamsJson(linearClient: LinearClient): Promise<string> {
     try {
       const teams = await linearClient.teams();
       if (!teams.nodes || teams.nodes.length === 0) {
         return "[]"; // Return an empty JSON array string
       }
       const teamList = teams.nodes.map((team) => ({ id: team.id, name: team.name }));
       return JSON.stringify(teamList, null, 2);
     } catch (e) {
       const error = e as Error;
       console.error("Failed to fetch available teams for error message (JSON):", error.message);
       return `"(Could not fetch available teams as JSON: ${error.message})"`; // Encapsulate error in string
     }
   }
   
   // New helper function for projects as JSON
   async function getAvailableProjectsJson(linearClient: LinearClient): Promise<string> {
     try {
       const projects = await linearClient.projects();
       if (!projects.nodes || projects.nodes.length === 0) {
         return "[]"; // Return an empty JSON array string
       }
       const projectList = projects.nodes.map((project) => ({ id: project.id, name: project.name }));
       return JSON.stringify(projectList, null, 2);
     } catch (e) {
       const error = e as Error;
       console.error("Failed to fetch available projects for error message (JSON):", error.message);
       return `"(Could not fetch available projects as JSON: ${error.message})"`; // Encapsulate error in string
     }
   }

// Define proper types for the Linear API
type ProjectFilters = {
	first?: number;
	includeArchived?: boolean;
	before?: string;
	after?: string;
	teamId?: string;
};

type ProjectInput = {
	name: string;
	teamIds: string[];
	description?: string;
	content?: string;
	startDate?: string;
	targetDate?: string;
};

type ProjectUpdateInput = {
	name?: string;
	description?: string;
	content?: string;
	startDate?: string;
	targetDate?: string;
};

export const listProjectsTool = defineTool({
	name: "list_projects",
	description: "List projects in the user's Linear workspace",
	inputSchema: ProjectFilterSchema,
	handler: async (args) => {
		try {
			const { limit, before, after, includeArchived, teamId } = args;
			const linearClient = getLinearClient();

			// Validate teamId if provided
			if (teamId) {
				try {
					const team = await linearClient.team(teamId); // Attempt to fetch the team
					if (!team) { // If team is null or undefined, it's not found
						const availableTeamsJsonString = await getAvailableTeamsJson(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid teamId: '${teamId}'. Team not found. Valid teams are: ${availableTeamsJsonString}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableTeamsJsonString = await getAvailableTeamsJson(linearClient);
					let specificMessage = `Invalid teamId: '${teamId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							 specificMessage = `${specificMessage} Team not found or ID is invalid.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during team validation.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} Valid teams are: ${availableTeamsJsonString}`
					);
				}
			}

			const filters: Record<string, unknown> = {
				first: limit,
				includeArchived,
				teamId,
			};
			if (before) filters.before = before;
			if (after) filters.after = after;

			const projectsConnection = await linearClient.projects(filters);
			const projects = await Promise.all(
				projectsConnection.nodes.map(async (projectFetch) => {
					const project = await projectFetch;
					return {
						id: project.id,
						name: project.name,
						description: project.description,
						content: project.content,
						icon: project.icon,
						color: project.color,
						state: project.state,
						startDate: project.startDate,
						targetDate: project.targetDate,
						createdAt: project.createdAt,
						updatedAt: project.updatedAt,
						url: project.url,
					};
				}),
			);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(projects),
					},
				],
			};
		} catch (error: unknown) {
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to list projects: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const getProjectTool = defineTool({
	name: "get_project",
	description: "Retrieve details of a specific project in Linear",
	inputSchema: ProjectQuerySchema,
	handler: async ({ query }) => {
		const linearClient = getLinearClient();
		try {
			const projectFetch = await linearClient.project(query);
			if (projectFetch) {
				const project = await projectFetch;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: project.id,
								name: project.name,
								description: project.description,
								content: project.content,
								icon: project.icon,
								color: project.color,
								state: project.state,
								startDate: project.startDate,
								targetDate: project.targetDate,
								createdAt: project.createdAt,
								updatedAt: project.updatedAt,
								url: project.url,
							}),
						},
					],
				};
			}
		} catch (error: unknown) {
			// continue to search by name
		}
		try {
			const projectsConnection = await linearClient.projects({
				filter: {
					name: { eq: query },
				},
			});
			if (projectsConnection.nodes.length > 0) {
				const project = await projectsConnection.nodes[0];
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: project.id,
								name: project.name,
								description: project.description,
								content: project.content,
								icon: project.icon,
								color: project.color,
								state: project.state,
								startDate: project.startDate,
								targetDate: project.targetDate,
								createdAt: project.createdAt,
								updatedAt: project.updatedAt,
								url: project.url,
							}),
						},
					],
				};
			}
		} catch (error: unknown) {
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to get project: ${err.message || "Unknown error"}`,
			);
		}
		// If project not found by ID or name, fetch all projects and include in error message
		try {
			const allProjects = await linearClient.projects();
			const validProjects = allProjects.nodes.map(p => ({ id: p.id, name: p.name }));
			throw new McpError(
				ErrorCode.InvalidParams,
				`Project with query "${query}" not found. Valid projects are: ${JSON.stringify(validProjects, null, 2)}`,
			);
		} catch (listError: unknown) {
			const err = listError as { message?: string };
			// If listing projects also fails, throw a generic not found error
			throw new McpError(
				ErrorCode.InvalidParams,
				`Project with query "${query}" not found. Also failed to list available projects: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const createProjectTool = defineTool({
	name: "create_project",
	description: "Create a new project in Linear",
	inputSchema: ProjectCreateSchema,
	handler: async (args) => {
		try {
			const { name, description, content, startDate, targetDate, teamIds } =
				args;
			const projectInput: ProjectInput = {
				name,
				teamIds,
				description,
				content,
				startDate,
				targetDate,
			};
			const linearClient = getLinearClient();
			const projectPayload = await linearClient.createProject(projectInput);
			if (projectPayload.project) {
				const project = await projectPayload.project;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: project.id,
								name: project.name,
								description: project.description,
								content: project.content,
								icon: project.icon,
								color: project.color,
								state: project.state,
								startDate: project.startDate,
								targetDate: project.targetDate,
								createdAt: project.createdAt,
								updatedAt: project.updatedAt,
								url: project.url,
							}),
						},
					],
				};
			}
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to create project: No project returned",
			);
		} catch (error: unknown) {
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to create project: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const updateProjectTool = defineTool({
	name: "update_project",
	description: "Update an existing Linear project",
	inputSchema: ProjectUpdateSchema,
	handler: async (args) => {
		try {
			const { id, name, description, content, startDate, targetDate, teamIds } = args;
			const linearClient = getLinearClient();

			// Validate project id
			try {
				const projectToUpdate = await linearClient.project(id);
				if (!projectToUpdate) {
					const availableProjectsJsonString = await getAvailableProjectsJson(linearClient);
					throw new McpError(
						ErrorCode.InvalidParams,
						`Invalid project id: '${id}'. Project not found. Valid projects are: ${availableProjectsJsonString}`
					);
				}
			} catch (error: unknown) {
				const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
				const availableProjectsJsonString = await getAvailableProjectsJson(linearClient);
				let specificMessage = `Invalid project id: '${id}'.`;
				if (err.extensions?.userPresentableMessage) {
					specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
				} else if (err.message) {
					if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
						 specificMessage = `${specificMessage} Project not found or ID is invalid.`;
					} else {
						specificMessage = `${specificMessage} Error during validation: ${err.message}`;
					}
				} else {
					specificMessage = `${specificMessage} An unknown error occurred during project validation.`;
				}
				throw new McpError(
					ErrorCode.InvalidParams,
					`${specificMessage} Valid projects are: ${availableProjectsJsonString}`
				);
			}

			// Validate teamIds if provided
			if (teamIds && teamIds.length > 0) {
				const availableTeams = await linearClient.teams();
				const validTeamIds = availableTeams.nodes.map(team => team.id);
				const invalidTeamIds = teamIds.filter(teamId => !validTeamIds.includes(teamId));

				if (invalidTeamIds.length > 0) {
					const availableTeamsJsonString = await getAvailableTeamsJson(linearClient);
					throw new McpError(
						ErrorCode.InvalidParams,
						`Invalid teamId(s): '${invalidTeamIds.join(", ")}'. Team(s) not found. Valid teams are: ${availableTeamsJsonString}`
					);
				}
			}


			const projectInput: ProjectUpdateInput & { teamIds?: string[] } = {
				name,
				description,
				content,
				startDate,
				targetDate,
			};

			// Only include teamIds in the input if provided in args
			if (teamIds !== undefined) {
				projectInput.teamIds = teamIds;
			}


			const projectPayload = await linearClient.updateProject(id, projectInput);
			if (projectPayload.project) {
				const project = await projectPayload.project;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: project.id,
								name: project.name,
								description: project.description,
								content: project.content,
								icon: project.icon,
								color: project.color,
								state: project.state,
								startDate: project.startDate,
								targetDate: project.targetDate,
								createdAt: project.createdAt,
								updatedAt: project.updatedAt,
								url: project.url,
							}),
						},
					],
				};
			}
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to update project: No project returned",
			);
		} catch (error: unknown) {
			// Handle cases where the error is already an McpError (e.g. from validation)
			if (error instanceof McpError) {
				throw error;
			}
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to update project: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const projectTools = {
	listProjectsTool,
	getProjectTool,
	createProjectTool,
	updateProjectTool,
};
