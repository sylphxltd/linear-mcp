import type {
	CommentPayload,
	Issue,
	IssuePayload,
	LinearClient,
	Comment as LinearComment,
	Project,
	Team,
	User,
	WorkflowState,
} from "@linear/sdk";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
	CommentCreateSchema,
	IdSchema,
	IssueCreateSchema,
	IssueFilterSchema,
	IssueUpdateSchema,
	type ToolDefinition,
	defineTool,
} from "../schemas/index.js";
import { getLinearClient } from "../utils/linear-client.js";

async function getAvailableTeamsJson(linearClient: LinearClient): Promise<string> {
  try {
    const teams = await linearClient.teams();
    if (!teams.nodes || teams.nodes.length === 0) {
      return "[]";
    }
    const teamList = teams.nodes.map((team) => ({ id: team.id, name: team.name, key: team.key }));
    return JSON.stringify(teamList, null, 2);
  } catch (e) {
    const error = e as Error;
    console.error("Failed to fetch available teams for error message (JSON):", error.message);
    return `"(Could not fetch available teams as JSON: ${error.message})"`;
  }
}
async function getAvailableProjectsJson(linearClient: LinearClient): Promise<string> {
  try {
    const projects = await linearClient.projects();
    if (!projects.nodes || projects.nodes.length === 0) {
      return "[]";
    }
    const projectList = projects.nodes.map((project) => ({ id: project.id, name: project.name }));
    return JSON.stringify(projectList, null, 2);
  } catch (e) {
    const error = e as Error;
    console.error("Failed to fetch available projects for error message (JSON):", error.message);
    return `"(Could not fetch available projects as JSON: ${error.message})"`;
  }
}
async function getAvailableStatesJson(linearClient: LinearClient, teamId: string): Promise<string> {
  if (!teamId) {
    return `"(Cannot fetch states without a valid teamId. Please provide a teamId.)"`;
  }
  try {
    const team = await linearClient.team(teamId);
    if (!team) {
      const availableTeams = await getAvailableTeamsJson(linearClient);
      return `"(Could not fetch states: Team with ID '${teamId}' not found. Valid teams are: ${availableTeams})"`;
    }
    const states = await team.states();
    if (!states.nodes || states.nodes.length === 0) {
      return "[]";
    }
    const stateList = states.nodes.map((state) => ({ id: state.id, name: state.name, type: state.type }));
    return JSON.stringify(stateList, null, 2);
  } catch (e) {
    const error = e as Error;
    console.error(`Failed to fetch available states for team ${teamId} for error message (JSON):`, error.message);
    return `"(Could not fetch available states for team ${teamId} as JSON: ${error.message})"`;
  }
}
async function getAvailableAssigneesJson(linearClient: LinearClient): Promise<string> {
  try {
    const users = await linearClient.users();
    if (!users.nodes || users.nodes.length === 0) {
      return "[]";
    }
    const userList = users.nodes
      .filter(user => user.active)
      .map((user) => ({ id: user.id, name: user.displayName, email: user.email }));
    if (userList.length === 0) {
        return "[]"; // No active users
    }
    return JSON.stringify(userList, null, 2);
  } catch (e) {
    const error = e as Error;
    console.error("Failed to fetch available assignees for error message (JSON):", error.message);
    return `"(Could not fetch available assignees as JSON: ${error.message})"`;
  }
}
async function getAvailableLabelsJson(linearClient: LinearClient, teamId: string): Promise<string> {
  if (!teamId) {
    return `"(Cannot fetch labels without a valid teamId. Please provide a teamId.)"`;
  }
  try {
    const team = await linearClient.team(teamId);
    if (!team) {
      const availableTeams = await getAvailableTeamsJson(linearClient);
      return `"(Could not fetch labels: Team with ID '${teamId}' not found. Valid teams are: ${availableTeams})"`;
    }
    const labels = await team.labels();
    if (!labels.nodes || labels.nodes.length === 0) {
      return "[]";
    }
    const labelList = labels.nodes.map((label) => ({ id: label.id, name: label.name, color: label.color }));
    return JSON.stringify(labelList, null, 2);
  } catch (e) {
    const error = e as Error;
    console.error(`Failed to fetch available labels for team ${teamId} for error message (JSON):`, error.message);
    return `"(Could not fetch available labels for team ${teamId} as JSON: ${error.message})"`;
  }
}
async function getAvailableProjectMilestonesJson(linearClient: LinearClient, projectId?: string): Promise<string> {
  try {
    let milestones: Awaited<ReturnType<LinearClient['projectMilestones']>>;
    let project: Project | undefined;

    if (projectId && projectId !== "any" && projectId.trim() !== "") {
       project = await linearClient.project(projectId);
       if (!project) {
         const availableProjects = await getAvailableProjectsJson(linearClient);
         return `"(Could not fetch milestones: Project with ID '${projectId}' not found. Valid projects are: ${availableProjects})"`;
       }
       milestones = await project.projectMilestones();
    } else {
      const allProjects = await linearClient.projects();
      const projectList = allProjects.nodes.map(p => ({id: p.id, name: p.name}));
      return `"(Project milestones are specific to a project. Please provide a valid projectId. Available projects: ${JSON.stringify(projectList, null, 2)})"`;
    }

    if (!milestones || !milestones.nodes || milestones.nodes.length === 0) {
      return "[]";
    }
    const milestoneList = milestones.nodes.map((milestone) => ({ id: milestone.id, name: milestone.name }));
    return JSON.stringify(milestoneList, null, 2);
  } catch (e) {
    const error = e as Error;
    console.error(`Failed to fetch available project milestones for project ${projectId} for error message (JSON):`, error.message);
    if (projectId && projectId !== "any" && error.message.toLowerCase().includes("not found")) {
        const availableProjects = await getAvailableProjectsJson(linearClient);
        return `"(Could not fetch milestones for project '${projectId}': ${error.message}. Valid projects are: ${availableProjects})"`;
    }
    return `"(Could not fetch available project milestones for project ${projectId} as JSON: ${error.message})"`;
  }
}

type IssueFilters = {
	filter?: Record<string, unknown>;
	teamId?: string;
	stateId?: string;
	assigneeId?: string;
	includeArchived?: boolean;
	first?: number;
};

export const listIssuesTool = defineTool({
	name: "list_issues",
	description: "List issues in the user's Linear workspace",
	inputSchema: IssueFilterSchema,
	handler: async (args) => {
		try {
			const {
				query,
				teamId,
				stateId,
				assigneeId,
				projectMilestoneId,
				includeArchived = true,
				limit = 50,
			} = args;

			const linearClient = getLinearClient();

			if (teamId) {
				try {
					const team = await linearClient.team(teamId);
					if (!team) {
						const availableTeamsJson = await getAvailableTeamsJson(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid teamId: '${teamId}'. Team not found. Valid teams are: ${availableTeamsJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableTeamsJson = await getAvailableTeamsJson(linearClient);
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
						`${specificMessage} Valid teams are: ${availableTeamsJson}`
					);
				}
			}

			if (stateId && teamId) {
				try {
					const team = await linearClient.team(teamId);
					if (!team) {
						const availableTeamsJson = await getAvailableTeamsJson(linearClient);
						throw new McpError(ErrorCode.InvalidParams, `Cannot validate stateId: Team '${teamId}' not found. Valid teams are: ${availableTeamsJson}`);
					}
					const states = await team.states({ filter: { id: { eq: stateId } } });
					if (!states.nodes || states.nodes.length === 0) {
						const availableStatesJson = await getAvailableStatesJson(linearClient, teamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid stateId: '${stateId}' for team '${team.name}' (${teamId}). State not found. Valid states for this team are: ${availableStatesJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableStatesJson = await getAvailableStatesJson(linearClient, teamId);
					let specificMessage = `Invalid stateId: '${stateId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} State not found or ID is invalid for team '${teamId}'.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during state validation for team '${teamId}'.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} Valid states for this team are: ${availableStatesJson}`
					);
				}
			} else if (stateId && !teamId) {
				const availableTeamsJson = await getAvailableTeamsJson(linearClient);
				throw new McpError(ErrorCode.InvalidParams, `Cannot validate stateId: 'teamId' is required when 'stateId' is provided. Valid teams are: ${availableTeamsJson}`);
			}

			if (assigneeId) {
				try {
					const assignee = await linearClient.user(assigneeId);
					if (!assignee || !assignee.active) {
						const availableAssigneesJson = await getAvailableAssigneesJson(linearClient);
						let message = `Invalid assigneeId: '${assigneeId}'.`;
						if (!assignee) {
							message += " User not found.";
						} else if (!assignee.active) {
							message += ` User '${assignee.displayName}' (${assigneeId}) is not active.`;
						}
						throw new McpError(
							ErrorCode.InvalidParams,
							`${message} Valid assignees are: ${availableAssigneesJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableAssigneesJson = await getAvailableAssigneesJson(linearClient);
					let specificMessage = `Invalid assigneeId: '${assigneeId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} User not found or ID is invalid.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during assignee validation.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} Valid assignees are: ${availableAssigneesJson}`
					);
				}
			}

			if (projectMilestoneId) {
				try {
					const projectMilestone = await linearClient.projectMilestone(projectMilestoneId);
					if (!projectMilestone) {
						const availableMilestonesJson = await getAvailableProjectMilestonesJson(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid projectMilestoneId: '${projectMilestoneId}'. Project milestone not found. ${availableMilestonesJson}`
						);
					}
				} catch (error: unknown) {
					if (error instanceof McpError) {
						throw error;
					}
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableMilestonesJson = await getAvailableProjectMilestonesJson(linearClient);
					let specificMessage = `Invalid projectMilestoneId: '${projectMilestoneId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} Project milestone not found or ID is invalid.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during project milestone validation.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} ${availableMilestonesJson}`
					);
				}
			}

			const filters: IssueFilters = {};
			if (query) {
				filters.filter = {
					...(filters.filter || {}),
					or: [
						{ title: { containsIgnoreCase: query } },
						{ description: { containsIgnoreCase: query } },
					],
				};
			}
			if (teamId) filters.teamId = teamId;
			if (stateId) {
				filters.filter = { ...(filters.filter || {}), state: { id: { eq: stateId } } };
			}
			if (assigneeId) {
				filters.filter = { ...(filters.filter || {}), assignee: { id: { eq: assigneeId } } };
			}
			if (projectMilestoneId) {
				filters.filter = { ...(filters.filter || {}), projectMilestone: { id: { eq: projectMilestoneId } } };
			}
			filters.includeArchived = includeArchived;
			filters.first = limit;
			const issuesConnection = await linearClient.issues(
				filters as Parameters<typeof linearClient.issues>[0],
			);
			const issues = await Promise.all(
				issuesConnection.nodes.map(async (issueNode: Issue) => {
					const stateEntity = await issueNode.state;
					const assigneeEntity = await issueNode.assignee;
					const projectMilestoneEntity = await issueNode.projectMilestone;
					return {
						id: issueNode.id,
						identifier: issueNode.identifier,
						title: issueNode.title,
						description: issueNode.description,
						priority: issueNode.priority,
						state: stateEntity
							? {
									id: stateEntity.id,
									name: stateEntity.name,
									color: stateEntity.color,
									type: stateEntity.type,
								}
							: null,
						assignee: assigneeEntity
							? {
									id: assigneeEntity.id,
									name: assigneeEntity.name,
									email: assigneeEntity.email,
								}
							: null,
						projectMilestone: projectMilestoneEntity
							? { id: projectMilestoneEntity.id, name: projectMilestoneEntity.name }
							: null,
						createdAt: issueNode.createdAt,
						updatedAt: issueNode.updatedAt,
						url: issueNode.url,
					};
				}),
			);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(issues),
					},
				],
			};
		} catch (error: unknown) {
      if (error instanceof McpError) throw error;
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to list issues: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const getIssueTool = defineTool({
	name: "get_issue",
	description: "Retrieve a Linear issue details by ID, including attachments",
	inputSchema: IdSchema,
	handler: async (args) => {
		try {
			const { id } = args;
			const linearClient = getLinearClient();
			const issue: Issue | undefined = await linearClient.issue(id);
			if (!issue) {
				let recentIssuesMessage = "";
				try {
					// biome-ignore lint/suspicious/noExplicitAny: SDK's PaginationOrderBy type is restrictive; "updatedAt" is expected at runtime.
					const recentIssues = await linearClient.issues({ first: 10, orderBy: "updatedAt" as any });
					if (recentIssues.nodes.length > 0) {
						const issueList = recentIssues.nodes.map(iss => ({ id: iss.id, title: iss.title, identifier: iss.identifier }));
						recentIssuesMessage = ` Recent issues include: ${JSON.stringify(issueList, null, 2)}`;
					}
				} catch (listError) {
					recentIssuesMessage = " (Could not fetch recent issues for context.)";
				}
				throw new McpError(
					ErrorCode.InvalidParams,
					`Issue with ID '${id}' not found.${recentIssuesMessage}`
				);
			}
			const attachments = await issue.attachments();
			const state = await issue.state;
			const assignee = await issue.assignee;
			const team = await issue.team;
			const project = await issue.project;
			const projectMilestone = await issue.projectMilestone;
			const labelsResult = await issue.labels();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							id: issue.id,
							identifier: issue.identifier,
							title: issue.title,
							description: issue.description,
							priority: issue.priority,
							state: state
								? {
										id: state.id,
										name: state.name,
										color: state.color,
										type: state.type,
									}
								: null,
							assignee: assignee
								? {
										id: assignee.id,
										name: assignee.name,
										email: assignee.email,
									}
								: null,
							team: team
								? {
										id: team.id,
										name: team.name,
										key: team.key,
									}
								: null,
							project: project
								? {
										id: project.id,
										name: project.name,
									}
								: null,
							projectMilestone: projectMilestone
								? {
										id: projectMilestone.id,
										name: projectMilestone.name,
									}
								: null,
							labels: labelsResult.nodes.map((label) => ({
								id: label.id,
								name: label.name,
								color: label.color,
							})),
							attachments: attachments.nodes.map((attachment) => ({
								id: attachment.id,
								title: attachment.title,
								url: attachment.url,
								source: attachment.source,
								metadata: attachment.metadata,
								groupBySource: attachment.groupBySource,
								createdAt: attachment.createdAt,
								updatedAt: attachment.updatedAt,
							})),
							createdAt: issue.createdAt,
							updatedAt: issue.updatedAt,
							url: issue.url,
						}),
					},
				],
			};
		} catch (error: unknown) {
      if (error instanceof McpError) throw error;
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to get issue: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const createIssueTool = defineTool({
	name: "create_issue",
	description: "Create a new Linear issue",
	inputSchema: IssueCreateSchema,
	handler: async (args) => {
		try {
			const {
				title,
				description,
				teamId,
				priority,
				projectId,
				stateId,
				assigneeId,
				labelIds,
				dueDate,
				projectMilestoneId,
			} = args;
			const linearClient = getLinearClient();

			if (teamId) {
				try {
					const team = await linearClient.team(teamId);
					if (!team) {
						const availableTeamsJson = await getAvailableTeamsJson(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid teamId: '${teamId}'. Team not found. Valid teams are: ${availableTeamsJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableTeamsJson = await getAvailableTeamsJson(linearClient);
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
						`${specificMessage} Valid teams are: ${availableTeamsJson}`
					);
				}
			} else {
        throw new McpError(ErrorCode.InvalidParams, "teamId is required to create an issue.");
      }


			if (projectId) {
				try {
					const project = await linearClient.project(projectId);
					if (!project) {
						const availableProjectsJson = await getAvailableProjectsJson(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid projectId: '${projectId}'. Project not found. Valid projects are: ${availableProjectsJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableProjectsJson = await getAvailableProjectsJson(linearClient);
					let specificMessage = `Invalid projectId: '${projectId}'.`;
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
						`${specificMessage} Valid projects are: ${availableProjectsJson}`
					);
				}
			}

			if (stateId && teamId) {
				try {
					const team = await linearClient.team(teamId);
					if (!team) { throw new McpError(ErrorCode.InternalError, "Team validation failed unexpectedly.");}
					const states = await team.states({ filter: { id: { eq: stateId } } });
					if (!states.nodes || states.nodes.length === 0) {
						const availableStatesJson = await getAvailableStatesJson(linearClient, teamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid stateId: '${stateId}' for team '${team.name}' (${teamId}). State not found. Valid states for this team are: ${availableStatesJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableStatesJson = await getAvailableStatesJson(linearClient, teamId);
					let specificMessage = `Invalid stateId: '${stateId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} State not found or ID is invalid for team '${teamId}'.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during state validation for team '${teamId}'.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} Valid states for this team are: ${availableStatesJson}`
					);
				}
			} else if (stateId && !teamId) {
				 throw new McpError(ErrorCode.InvalidParams, "teamId is required when stateId is provided.");
			}

			if (assigneeId) {
				try {
					const assignee = await linearClient.user(assigneeId);
					if (!assignee || !assignee.active) {
						const availableAssigneesJson = await getAvailableAssigneesJson(linearClient);
						let messageText = `Invalid assigneeId: '${assigneeId}'.`;
						if (!assignee) {
							messageText += " User not found.";
						} else if (!assignee.active) {
							messageText += ` User '${assignee.displayName}' (${assigneeId}) is not active.`;
						}
						throw new McpError(
							ErrorCode.InvalidParams,
							`${messageText} Valid assignees are: ${availableAssigneesJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableAssigneesJson = await getAvailableAssigneesJson(linearClient);
					let specificMessage = `Invalid assigneeId: '${assigneeId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} User not found or ID is invalid.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during assignee validation.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} Valid assignees are: ${availableAssigneesJson}`
					);
				}
			}

			if (labelIds && labelIds.length > 0 && teamId) {
				try {
					const team = await linearClient.team(teamId);
					if (!team) { throw new McpError(ErrorCode.InternalError, "Team validation failed unexpectedly for labels.");}
					const teamLabels = await team.labels({ filter: { id: { in: labelIds } } });
					const foundLabelIds = teamLabels.nodes.map(label => label.id);
					const invalidLabelIds = labelIds.filter(labelId => !foundLabelIds.includes(labelId));
					if (invalidLabelIds.length > 0) {
						const availableLabelsJson = await getAvailableLabelsJson(linearClient, teamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid labelId(s): '${invalidLabelIds.join(", ")}' for team '${team.name}' (${teamId}). Label(s) not found. Valid labels for this team are: ${availableLabelsJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableLabelsJson = await getAvailableLabelsJson(linearClient, teamId);
					let specificMessage = `Invalid labelId(s) provided for team '${teamId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} One or more labels not found or IDs are invalid for team '${teamId}'.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during label validation for team '${teamId}'.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} Valid labels for this team are: ${availableLabelsJson}`
					);
				}
			} else if (labelIds && labelIds.length > 0 && !teamId) {
				 throw new McpError(ErrorCode.InvalidParams, "teamId is required when labelIds are provided.");
			}

			if (projectMilestoneId) {
				try {
					const projectMilestone = await linearClient.projectMilestone(projectMilestoneId);
					if (!projectMilestone) {
						const availableMilestonesJson = await getAvailableProjectMilestonesJson(linearClient, projectId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid projectMilestoneId: '${projectMilestoneId}'. Project milestone not found. ${availableMilestonesJson}`
						);
					}
					if (projectId && projectMilestone.projectId !== projectId) {
						const projectForMilestone = await linearClient.project(projectId);
						const milestoneProject = await projectMilestone.project;
						const availableMilestonesForGivenProjectJson = await getAvailableProjectMilestonesJson(linearClient, projectId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Project milestone '${projectMilestone.name}' (${projectMilestoneId}) does not belong to project '${projectForMilestone?.name}' (${projectId}). It belongs to '${milestoneProject?.name}' (${milestoneProject?.id}). Valid milestones for project '${projectForMilestone?.name}' are: ${availableMilestonesForGivenProjectJson}`
						);
					}
				} catch (error: unknown) {
					if (error instanceof McpError) throw error;
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableMilestonesJson = await getAvailableProjectMilestonesJson(linearClient, projectId);
					let specificMessage = `Invalid projectMilestoneId: '${projectMilestoneId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} Project milestone not found or ID is invalid.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during project milestone validation.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} ${availableMilestonesJson}`
					);
				}
			}

			const issuePayload: IssuePayload = await linearClient.createIssue({
				title,
				description,
				teamId,
				priority,
				projectId,
				stateId,
				assigneeId,
				labelIds,
				dueDate,
				projectMilestoneId,
			});

			if (issuePayload.success && issuePayload.issue) {
				const issueEntity = await issuePayload.issue;
				const stateEntity = await issueEntity.state;
				const assigneeEntity = await issueEntity.assignee;
				const projectMilestoneEntity = await issueEntity.projectMilestone;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: issueEntity.id,
								identifier: issueEntity.identifier,
								title: issueEntity.title,
								description: issueEntity.description,
								priority: issueEntity.priority,
								state: stateEntity ? { id: stateEntity.id, name: stateEntity.name, color: stateEntity.color, type: stateEntity.type } : null,
								assignee: assigneeEntity ? { id: assigneeEntity.id, name: assigneeEntity.name, email: assigneeEntity.email } : null,
								projectMilestone: projectMilestoneEntity ? { id: projectMilestoneEntity.id, name: projectMilestoneEntity.name } : null,
								createdAt: issueEntity.createdAt,
								updatedAt: issueEntity.updatedAt,
								url: issueEntity.url,
							}),
						},
					],
				};
			}
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to create issue: ${issuePayload.lastSyncId ? `Sync ID ${issuePayload.lastSyncId}` : "No issue returned and no Sync ID"}`,
			);
		} catch (error: unknown) {
			if (error instanceof McpError) {
				throw error;
			}
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to create issue: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const updateIssueTool = defineTool({
	name: "update_issue",
	description: "Update an existing Linear issue",
	inputSchema: IssueUpdateSchema,
	handler: async (args) => {
		try {
			const {
				id,
				title,
				description,
				priority,
				projectId,
				stateId,
				assigneeId,
				labelIds,
				dueDate,
				projectMilestoneId,
			} = args;
			const linearClient = getLinearClient();

			const issueToUpdate = await linearClient.issue(id);
			if (!issueToUpdate) {
				let recentIssuesMessage = "";
				try {
					// biome-ignore lint/suspicious/noExplicitAny: SDK's PaginationOrderBy type is restrictive; "updatedAt" is expected at runtime.
					const recentIssues = await linearClient.issues({ first: 10, orderBy: "updatedAt" as any });
					if (recentIssues.nodes.length > 0) {
						const issueList = recentIssues.nodes.map(iss => ({ id: iss.id, title: iss.title, identifier: iss.identifier }));
						recentIssuesMessage = ` Recent issues include: ${JSON.stringify(issueList, null, 2)}`;
					}
				} catch (listError) {
					recentIssuesMessage = " (Could not fetch recent issues for context.)";
				}
				throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${id}' not found.${recentIssuesMessage}`);
			}
			const currentTeamId = (await issueToUpdate.team)?.id;

			if (projectId) {
				try {
					const project = await linearClient.project(projectId);
					if (!project) {
						const availableProjectsJson = await getAvailableProjectsJson(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid projectId: '${projectId}'. Project not found. Valid projects are: ${availableProjectsJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableProjectsJson = await getAvailableProjectsJson(linearClient);
					let specificMessage = `Invalid projectId: '${projectId}'.`;
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
						`${specificMessage} Valid projects are: ${availableProjectsJson}`
					);
				}
			}

			if (stateId) {
				if (!currentTeamId) {
					throw new McpError(ErrorCode.InternalError, `Issue '${id}' does not have a team associated, cannot validate stateId. Please ensure the issue is associated with a team or provide a teamId if changing teams.`);
				}
				try {
					const team = await linearClient.team(currentTeamId);
					if (!team) {
						throw new McpError(ErrorCode.InternalError, `Team with ID '${currentTeamId}' for issue '${id}' not found unexpectedly.`);
					}
					const states = await team.states({ filter: { id: { eq: stateId } } });
					if (!states.nodes || states.nodes.length === 0) {
						const availableStatesJson = await getAvailableStatesJson(linearClient, currentTeamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid stateId: '${stateId}' for issue's team '${team.name}' (${currentTeamId}). State not found. Valid states for this team are: ${availableStatesJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableStatesJson = await getAvailableStatesJson(linearClient, currentTeamId);
					let specificMessage = `Invalid stateId: '${stateId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} State not found or ID is invalid for team '${currentTeamId}'.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during state validation for team '${currentTeamId}'.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} Valid states for this team are: ${availableStatesJson}`
					);
				}
			}

			if (assigneeId) {
				try {
					const assignee = await linearClient.user(assigneeId);
					if (!assignee || !assignee.active) {
						const availableAssigneesJson = await getAvailableAssigneesJson(linearClient);
						let messageText = `Invalid assigneeId: '${assigneeId}'.`;
						if (!assignee) {
							messageText += " User not found.";
						} else if (!assignee.active) {
							messageText += ` User '${assignee.displayName}' (${assigneeId}) is not active.`;
						}
						throw new McpError(
							ErrorCode.InvalidParams,
							`${messageText} Valid assignees are: ${availableAssigneesJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableAssigneesJson = await getAvailableAssigneesJson(linearClient);
					let specificMessage = `Invalid assigneeId: '${assigneeId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} User not found or ID is invalid.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during assignee validation.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} Valid assignees are: ${availableAssigneesJson}`
					);
				}
			}

			if (labelIds && labelIds.length > 0) {
				if (!currentTeamId) {
					throw new McpError(ErrorCode.InternalError, `Issue '${id}' does not have a team associated, cannot validate labelIds. Please ensure the issue is associated with a team.`);
				}
				try {
					const team = await linearClient.team(currentTeamId);
					if (!team) { throw new McpError(ErrorCode.InternalError, `Team with ID '${currentTeamId}' for issue '${id}' not found unexpectedly.`); }

					const teamLabels = await team.labels({ filter: { id: { in: labelIds } } });
					const foundLabelIds = teamLabels.nodes.map(label => label.id);
					const invalidLabelIds = labelIds.filter(labelId => !foundLabelIds.includes(labelId));
					if (invalidLabelIds.length > 0) {
						const availableLabelsJson = await getAvailableLabelsJson(linearClient, currentTeamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid labelId(s): '${invalidLabelIds.join(", ")}' for issue's team '${team.name}' (${currentTeamId}). Label(s) not found. Valid labels for this team are: ${availableLabelsJson}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableLabelsJson = await getAvailableLabelsJson(linearClient, currentTeamId);
					let specificMessage = `Invalid labelId(s) provided for team '${currentTeamId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
							specificMessage = `${specificMessage} One or more labels not found or IDs are invalid for team '${currentTeamId}'.`;
						} else {
							specificMessage = `${specificMessage} Error during validation: ${err.message}`;
						}
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during label validation for team '${currentTeamId}'.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage} Valid labels for this team are: ${availableLabelsJson}`
					);
				}
			}


			if (projectMilestoneId === null || projectMilestoneId) {
				if (projectMilestoneId) {
					try {
						const projectMilestone = await linearClient.projectMilestone(projectMilestoneId);
						if (!projectMilestone) {
							const issueCurrentProject = await issueToUpdate.project;
							const availableMilestonesJson = await getAvailableProjectMilestonesJson(linearClient, issueCurrentProject?.id);
							throw new McpError(
								ErrorCode.InvalidParams,
								`Invalid projectMilestoneId: '${projectMilestoneId}'. Project milestone not found. ${availableMilestonesJson}`
							);
						}
						const issueCurrentProjectId = (await issueToUpdate.project)?.id;
						if (issueCurrentProjectId && projectMilestone.projectId !== issueCurrentProjectId) {
							const issueProjectDetails = await linearClient.project(issueCurrentProjectId);
							const milestoneProjectDetails = await projectMilestone.project;
							const availableMilestonesForIssueProjectJson = await getAvailableProjectMilestonesJson(linearClient, issueCurrentProjectId);
							throw new McpError(
								ErrorCode.InvalidParams,
								`Project milestone '${projectMilestone.name}' (${projectMilestoneId}) does not belong to the issue's project '${issueProjectDetails?.name}' (${issueCurrentProjectId}). It belongs to '${milestoneProjectDetails?.name}' (${milestoneProjectDetails?.id}). Valid milestones for issue's project are: ${availableMilestonesForIssueProjectJson}`
							);
						}
					} catch (error: unknown) {
						if (error instanceof McpError) throw error;
						const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
						const issueCurrentProject = await issueToUpdate.project;
						const availableMilestonesJson = await getAvailableProjectMilestonesJson(linearClient, issueCurrentProject?.id);
						let specificMessage = `Invalid projectMilestoneId: '${projectMilestoneId}'.`;
						if (err.extensions?.userPresentableMessage) {
							specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
						} else if (err.message) {
							if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("no entity found") || err.message.toLowerCase().includes("api error") || err.message.toLowerCase().includes("invalid uuid")) {
								specificMessage = `${specificMessage} Project milestone not found or ID is invalid.`;
							} else {
								specificMessage = `${specificMessage} Error during validation: ${err.message}`;
							}
						} else {
							specificMessage = `${specificMessage} An unknown error occurred during project milestone validation.`;
						}
						throw new McpError(
							ErrorCode.InvalidParams,
							`${specificMessage} ${availableMilestonesJson}`
						);
					}
				}
			}


			const issuePayload: IssuePayload = await linearClient.updateIssue(id, {
				title,
				description,
				priority,
				projectId,
				stateId,
				assigneeId,
				labelIds,
				dueDate,
				projectMilestoneId,
			});

			if (issuePayload.success && issuePayload.issue) {
				const issueEntity = await issuePayload.issue;
				const stateEntity = await issueEntity.state;
				const assigneeEntity = await issueEntity.assignee;
				const projectMilestoneEntity = await issueEntity.projectMilestone;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: issueEntity.id,
								identifier: issueEntity.identifier,
								title: issueEntity.title,
								description: issueEntity.description,
								priority: issueEntity.priority,
								state: stateEntity ? { id: stateEntity.id, name: stateEntity.name, color: stateEntity.color, type: stateEntity.type } : null,
								assignee: assigneeEntity ? { id: assigneeEntity.id, name: assigneeEntity.name, email: assigneeEntity.email } : null,
								projectMilestone: projectMilestoneEntity ? { id: projectMilestoneEntity.id, name: projectMilestoneEntity.name } : null,
								createdAt: issueEntity.createdAt,
								updatedAt: issueEntity.updatedAt,
								url: issueEntity.url,
							}),
						},
					],
				};
			}
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to update issue: ${issuePayload.lastSyncId ? `Sync ID ${issuePayload.lastSyncId}` : "No issue returned and no Sync ID"}`,
			);
		} catch (error: unknown) {
			if (error instanceof McpError) {
				throw error;
			}
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to update issue: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const listCommentsTool = defineTool({
	name: "list_comments",
	description: "Retrieve comments for a Linear issue by ID",
	inputSchema: { issueId: z.string().describe("The ID of the issue to fetch comments for") },
	handler: async ({ issueId }) => {
		try {
			const linearClient = getLinearClient();
			const issue = await linearClient.issue(issueId);
			if (!issue) {
				let recentIssuesMessage = "";
				try {
					// biome-ignore lint/suspicious/noExplicitAny: SDK's PaginationOrderBy type is restrictive; "updatedAt" is expected at runtime.
					const recentIssues = await linearClient.issues({ first: 10, orderBy: "updatedAt" as any });
					if (recentIssues.nodes.length > 0) {
						const issueList = recentIssues.nodes.map(iss => ({ id: iss.id, title: iss.title, identifier: iss.identifier }));
						recentIssuesMessage = ` Recent issues include: ${JSON.stringify(issueList, null, 2)}`;
					}
				} catch (listError) {
					recentIssuesMessage = " (Could not fetch recent issues for context.)";
				}
				throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${issueId}' not found when trying to list comments.${recentIssuesMessage}`);
			}

			const comments = await issue.comments();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							comments.nodes.map((comment: LinearComment) => ({
								id: comment.id,
								body: comment.body,
								createdAt: comment.createdAt,
								updatedAt: comment.updatedAt,
								userId: comment.userId,
							})),
						),
					},
				],
			};
		} catch (error: unknown) {
      if (error instanceof McpError) throw error;
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to list comments: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const createCommentTool = defineTool({
	name: "create_comment",
	description: "Create a comment on a Linear issue by ID",
	inputSchema: CommentCreateSchema,
	handler: async ({ issueId, body }) => {
		try {
			const linearClient = getLinearClient();
			const issue = await linearClient.issue(issueId);
      if (!issue) {
				let recentIssuesMessage = "";
				try {
					// biome-ignore lint/suspicious/noExplicitAny: SDK's PaginationOrderBy type is restrictive; "updatedAt" is expected at runtime.
					const recentIssues = await linearClient.issues({ first: 10, orderBy: "updatedAt" as any });
					if (recentIssues.nodes.length > 0) {
						const issueList = recentIssues.nodes.map(iss => ({ id: iss.id, title: iss.title, identifier: iss.identifier }));
						recentIssuesMessage = ` Recent issues include: ${JSON.stringify(issueList, null, 2)}`;
					}
				} catch (listError) {
					recentIssuesMessage = " (Could not fetch recent issues for context.)";
				}
        throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${issueId}' not found when trying to create comment.${recentIssuesMessage}`);
      }

			const commentPayload: CommentPayload = await linearClient.createComment({
				issueId,
				body,
			});
			if (commentPayload.success && commentPayload.comment) {
				const comment = await commentPayload.comment;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: comment.id,
								body: comment.body,
								createdAt: comment.createdAt,
								updatedAt: comment.updatedAt,
								userId: comment.userId,
							}),
						},
					],
				};
			}
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to create comment: ${commentPayload.lastSyncId ? `Sync ID ${commentPayload.lastSyncId}` : "No comment returned and no Sync ID"}`,
			);
		} catch (error: unknown) {
      if (error instanceof McpError) throw error;
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to create comment: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const getIssueGitBranchNameTool = defineTool({
	name: "get_issue_git_branch_name",
	description: "Retrieve the branch name for a Linear issue by ID",
	inputSchema: IdSchema,
	handler: async ({ id }) => {
		try {
			const linearClient = getLinearClient();
			const issue = await linearClient.issue(id);
			if (!issue) {
				let recentIssuesMessage = "";
				try {
					// biome-ignore lint/suspicious/noExplicitAny: SDK's PaginationOrderBy type is restrictive; "updatedAt" is expected at runtime.
					const recentIssues = await linearClient.issues({ first: 10, orderBy: "updatedAt" as any });
					if (recentIssues.nodes.length > 0) {
						const issueList = recentIssues.nodes.map(iss => ({ id: iss.id, title: iss.title, identifier: iss.identifier }));
						recentIssuesMessage = ` Recent issues include: ${JSON.stringify(issueList, null, 2)}`;
					}
				} catch (listError) {
					recentIssuesMessage = " (Could not fetch recent issues for context.)";
				}
				throw new McpError(ErrorCode.InvalidParams, `Issue with ID '${id}' not found when trying to get branch name.${recentIssuesMessage}`);
			}
			const branchName = await issue.branchName;
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({ branchName }),
					},
				],
			};
		} catch (error: unknown) {
      if (error instanceof McpError) throw error;
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to get issue branch name: ${err.message || "Unknown error"}`,
			);
		}
	},
});

// biome-ignore lint/suspicious/noExplicitAny: Workaround for TypeScript variance with generic ToolDefinition handlers in an array.
export const issueTools: ToolDefinition<any>[] = [
	// biome-ignore lint/suspicious/noExplicitAny: Workaround for TypeScript variance with generic ToolDefinition handlers in an array.
	listIssuesTool as ToolDefinition<any>,
	// biome-ignore lint/suspicious/noExplicitAny: Workaround for TypeScript variance with generic ToolDefinition handlers in an array.
	getIssueTool as ToolDefinition<any>,
	// biome-ignore lint/suspicious/noExplicitAny: Workaround for TypeScript variance with generic ToolDefinition handlers in an array.
	createIssueTool as ToolDefinition<any>,
	// biome-ignore lint/suspicious/noExplicitAny: Workaround for TypeScript variance with generic ToolDefinition handlers in an array.
	updateIssueTool as ToolDefinition<any>,
	// biome-ignore lint/suspicious/noExplicitAny: Workaround for TypeScript variance with generic ToolDefinition handlers in an array.
	listCommentsTool as ToolDefinition<any>,
	// biome-ignore lint/suspicious/noExplicitAny: Workaround for TypeScript variance with generic ToolDefinition handlers in an array.
	createCommentTool as ToolDefinition<any>,
	// biome-ignore lint/suspicious/noExplicitAny: Workaround for TypeScript variance with generic ToolDefinition handlers in an array.
	getIssueGitBranchNameTool as ToolDefinition<any>,
];
