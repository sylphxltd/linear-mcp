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
async function getAvailableStatesMessage(linearClient: LinearClient, teamId: string): Promise<string> {
  if (!teamId) {
    return "\n(Cannot fetch states without a valid teamId)";
  }
  try {
    const team = await linearClient.team(teamId);
    if (!team) {
      // This case should ideally be caught by teamId validation first,
      // but as a safeguard for this specific helper:
      return `\n(Could not fetch states: Team with ID '${teamId}' not found.)`;
    }
    const states = await team.states();
    if (!states.nodes || states.nodes.length === 0) {
      return ` No states available for team '${team.name}' (${teamId}).`; // Leading space
    }
    const stateList = states.nodes
      .map((state) => `  - ${state.id}: ${state.name} (Type: ${state.type})`)
      .join("\n");
    return `\nAvailable states for team '${team.name}' (${teamId}):\n${stateList}`;
  } catch (e) {
    console.error(`Failed to fetch available states for team ${teamId} for error message:`, e);
    return `\n(Could not fetch available states for team ${teamId} due to an internal error.)`;
  }
}
async function getAvailableAssigneesMessage(linearClient: LinearClient): Promise<string> {
  try {
    const users = await linearClient.users();
    if (!users.nodes || users.nodes.length === 0) {
      return " No users available to list as assignees."; // Leading space
    }
    const userList = users.nodes
      .filter(user => user.active) // Typically, only active users can be assignees
      .map((user) => `  - ${user.id}: ${user.displayName} (${user.email})`)
      .join("\n");
    if (userList.length === 0) {
      return " No active users available to list as assignees.";
    }
    return `\nAvailable assignees (active users):\n${userList}`;
  } catch (e) {
    console.error("Failed to fetch available assignees for error message:", e);
    return "\n(Could not fetch available assignees due to an internal error.)";
  }
}
async function getAvailableLabelsMessage(linearClient: LinearClient, teamId: string): Promise<string> {
  if (!teamId) {
    return "\n(Cannot fetch labels without a valid teamId)";
  }
  try {
    const team = await linearClient.team(teamId);
    if (!team) {
      return `\n(Could not fetch labels: Team with ID '${teamId}' not found.)`;
    }
    const labels = await team.labels();
    if (!labels.nodes || labels.nodes.length === 0) {
      return ` No labels available for team '${team.name}' (${teamId}).`; // Leading space
    }
    const labelList = labels.nodes
      .map((label) => `  - ${label.id}: ${label.name}`)
      .join("\n");
    return `\nAvailable labels for team '${team.name}' (${teamId}):\n${labelList}`;
  } catch (e) {
    console.error(`Failed to fetch available labels for team ${teamId} for error message:`, e);
    return `\n(Could not fetch available labels for team ${teamId} due to an internal error.)`;
  }
}
async function getAvailableProjectMilestonesMessage(linearClient: LinearClient, projectId?: string): Promise<string> {
  try {
    // If a specific projectId is provided, try to list milestones for that project.
    // Otherwise, list milestones for all projects (might be a large list).
    let milestones: Awaited<ReturnType<LinearClient['projectMilestones']>>;
    let project: Project | undefined;
    if (projectId && projectId !== "any") {
       project = await linearClient.project(projectId);
       if (!project) {
         return `\n(Could not fetch milestones: Project with ID '${projectId}' not found.)`;
       }
       // Assuming project.projectMilestones() exists and works
       milestones = await project.projectMilestones();
    } else {
      // Fallback to listing all milestones if no specific project or "any" is requested
      // Note: Linear API might not have a direct way to list ALL milestones across projects easily.
      // We'll list projects and then their milestones, which can be inefficient.
      // A more efficient approach might require a different API query or a dedicated tool.
      // For now, we'll list projects and indicate that milestones are project-specific.
      const projects = await linearClient.projects();
      if (!projects.nodes || projects.nodes.length === 0) {
        return "\n(Could not fetch milestones: No projects available to list.)";
      }
      const projectList = projects.nodes
        .map((p) => `  - ${p.id}: ${p.name}`)
        .join("\n");
      return `\nProject milestones are associated with specific projects. Please provide a valid projectId to list its milestones.\nAvailable projects:\n${projectList}`;
    }


    if (!milestones || !milestones.nodes || milestones.nodes.length === 0) {
      return ` No milestones available for project '${project?.name}' (${projectId}).`; // Leading space
    }
    const milestoneList = milestones.nodes
      .map((milestone) => `  - ${milestone.id}: ${milestone.name}`)
      .join("\n");
    return `\nAvailable milestones for project '${project?.name}' (${projectId}):\n${milestoneList}`;
  } catch (e) {
    console.error(`Failed to fetch available project milestones for project ${projectId} for error message:`, e);
    return `\n(Could not fetch available project milestones for project ${projectId} due to an internal error.)`;
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
				projectMilestoneId, // Added
				includeArchived = true,
				limit = 50,
			} = args;

			const linearClient = getLinearClient();

			// Validate teamId if provided
			if (teamId) {
				try {
					const team = await linearClient.team(teamId); // Attempt to fetch the team
					if (!team) { // If team is null or undefined, it's not found
						const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid teamId: '${teamId}'. Team not found.${availableTeamsMessage}`
						);
					}
				} catch (error: unknown) {
					// This catch block handles errors from linearClient.team() itself,
					// e.g., if the ID format is invalid or network issues occur during validation.
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
					let specificMessage = `Invalid teamId: '${teamId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						// Check if the SDK error message indicates "not found" or a generic API error for invalid ID
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
						`${specificMessage}${availableTeamsMessage}`
					);
				}
			}

			// Validate stateId if provided
			if (stateId && teamId) { // stateId validation depends on a valid teamId
				try {
					const team = await linearClient.team(teamId); // Re-fetch or assume teamId is validated
					if (!team) {
						// This should have been caught by teamId validation, but as a safeguard
						const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
						throw new McpError(ErrorCode.InvalidParams, `Cannot validate stateId: Team '${teamId}' not found.${availableTeamsMessage}`);
					}
					const states = await team.states({ filter: { id: { eq: stateId } } });
					if (!states.nodes || states.nodes.length === 0) {
						const availableStatesMessage = await getAvailableStatesMessage(linearClient, teamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid stateId: '${stateId}' for team '${team.name}' (${teamId}). State not found.${availableStatesMessage}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableStatesMessage = await getAvailableStatesMessage(linearClient, teamId);
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
						`${specificMessage}${availableStatesMessage}`
					);
				}
			} else if (stateId && !teamId) {
				const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
				throw new McpError(ErrorCode.InvalidParams, `Cannot validate stateId: 'teamId' is required when 'stateId' is provided.${availableTeamsMessage}`);
			}

			// Validate assigneeId if provided
			if (assigneeId) {
				try {
					const assignee = await linearClient.user(assigneeId); // Attempt to fetch the user
					if (!assignee || !assignee.active) { // Ensure user exists and is active
						const availableAssigneesMessage = await getAvailableAssigneesMessage(linearClient);
						let message = `Invalid assigneeId: '${assigneeId}'.`;
						if (!assignee) {
							message += " User not found.";
						} else if (!assignee.active) {
							message += ` User '${assignee.displayName}' (${assigneeId}) is not active.`;
						}
						throw new McpError(
							ErrorCode.InvalidParams,
							`${message}${availableAssigneesMessage}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableAssigneesMessage = await getAvailableAssigneesMessage(linearClient);
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
						`${specificMessage}${availableAssigneesMessage}`
					);
				}
			}

			// Validate projectMilestoneId if provided
			if (projectMilestoneId) {
				try {
					const projectMilestone = await linearClient.projectMilestone(projectMilestoneId); // Attempt to fetch the project milestone
					if (!projectMilestone) { // If not found
						// We need the project ID to list available milestones.
						// Since projectMilestoneId is provided, we can try to get the associated project.
						// However, the API might not directly support getting the project from a milestone ID easily here.
						// A simpler approach is to just list all available project milestones if the provided one is invalid.
						// This might return a large list, but it fulfills the requirement of providing available IDs.
						const availableMilestonesMessage = await getAvailableProjectMilestonesMessage(linearClient, "any"); // Pass "any" or similar if no specific project context
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid projectMilestoneId: '${projectMilestoneId}'. Project milestone not found.${availableMilestonesMessage}`
						);
					}
				} catch (error: unknown) {
					// Handle cases where the error is already an McpError (e.g. from getAvailableProjectMilestonesMessage)
					if (error instanceof McpError) {
						throw error;
					}
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableMilestonesMessage = await getAvailableProjectMilestonesMessage(linearClient, "any"); // Pass "any" or similar
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
						`${specificMessage}${availableMilestonesMessage}`
					);
				}
			}

			const filters: IssueFilters = {};
			if (query) {
				filters.filter = {
					...(filters.filter || {}), // Preserve existing filters if any
					or: [
						{ title: { containsIgnoreCase: query } },
						{ description: { containsIgnoreCase: query } },
					],
				};
			}
			if (teamId) filters.teamId = teamId; // This might be part of the main filter object
			if (stateId) { // This might be part of the main filter object
				filters.filter = { ...(filters.filter || {}), state: { id: { eq: stateId } } };
			}
			if (assigneeId) { // This might be part of the main filter object
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
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Issue with ID ${id} not found`,
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
							})),
							createdAt: issue.createdAt,
							updatedAt: issue.updatedAt,
							url: issue.url,
						}),
					},
				],
			};
		} catch (error: unknown) {
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
				projectMilestoneId, // Added
				stateId,
				assigneeId,
				labelIds,
				dueDate,
			} = args;
			const issueCreateInput: Parameters<
				typeof LinearClient.prototype.createIssue
			>[0] = {
				title,
				description,
				teamId,
			};
			if (priority !== undefined) issueCreateInput.priority = priority;
			if (projectId) issueCreateInput.projectId = projectId;
			if (projectMilestoneId) issueCreateInput.projectMilestoneId = projectMilestoneId; // Added
			if (stateId) issueCreateInput.stateId = stateId;
			if (assigneeId) issueCreateInput.assigneeId = assigneeId;
			if (labelIds) issueCreateInput.labelIds = labelIds;
			if (dueDate) issueCreateInput.dueDate = dueDate;
			const linearClient = getLinearClient();

			// Validate teamId if provided
			if (teamId) {
				try {
					const team = await linearClient.team(teamId); // Attempt to fetch the team
					if (!team) { // If team is null or undefined, it's not found
						const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid teamId: '${teamId}'. Team not found.${availableTeamsMessage}`
						);
					}
				} catch (error: unknown) {
					// This catch block handles errors from linearClient.team() itself,
					// e.g., if the ID format is invalid or network issues occur during validation.
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
					let specificMessage = `Invalid teamId: '${teamId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						// Check if the SDK error message indicates "not found" or a generic API error for invalid ID
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
						`${specificMessage}${availableTeamsMessage}`
					);
				}
			}

			// Validate projectId if provided
			if (projectId) {
				try {
					const project = await linearClient.project(projectId); // Attempt to fetch the project
					if (!project) { // If project is null or undefined, it's not found
						const availableProjectsMessage = await getAvailableProjectsMessage(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid projectId: '${projectId}'. Project not found.${availableProjectsMessage}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableProjectsMessage = await getAvailableProjectsMessage(linearClient);
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
						`${specificMessage}${availableProjectsMessage}`
					);
				}
			}

			// Validate stateId if provided
			if (stateId && teamId) { // stateId validation depends on a valid teamId
				try {
					const team = await linearClient.team(teamId); // Re-fetch or assume teamId is validated
					if (!team) {
						// This should have been caught by teamId validation, but as a safeguard
						const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
						throw new McpError(ErrorCode.InvalidParams, `Cannot validate stateId: Team '${teamId}' not found.${availableTeamsMessage}`);
					}
					const states = await team.states({ filter: { id: { eq: stateId } } });
					if (!states.nodes || states.nodes.length === 0) {
						const availableStatesMessage = await getAvailableStatesMessage(linearClient, teamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid stateId: '${stateId}' for team '${team.name}' (${teamId}). State not found.${availableStatesMessage}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableStatesMessage = await getAvailableStatesMessage(linearClient, teamId);
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
						`${specificMessage}${availableStatesMessage}`
					);
				}
			} else if (stateId && !teamId) {
				const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
				throw new McpError(ErrorCode.InvalidParams, `Cannot validate stateId: 'teamId' is required when 'stateId' is provided.${availableTeamsMessage}`);
			}

			// Validate assigneeId if provided
			if (assigneeId) {
				try {
					const assignee = await linearClient.user(assigneeId); // Attempt to fetch the user
					if (!assignee || !assignee.active) { // Ensure user exists and is active
						const availableAssigneesMessage = await getAvailableAssigneesMessage(linearClient);
						let message = `Invalid assigneeId: '${assigneeId}'.`;
						if (!assignee) {
							message += " User not found.";
						} else if (!assignee.active) {
							message += ` User '${assignee.displayName}' (${assigneeId}) is not active.`;
						}
						throw new McpError(
							ErrorCode.InvalidParams,
							`${message}${availableAssigneesMessage}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableAssigneesMessage = await getAvailableAssigneesMessage(linearClient);
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
						`${specificMessage}${availableAssigneesMessage}`
					);
				}
			}

			// Validate labelIds if provided
			if (labelIds && labelIds.length > 0 && teamId) { // labelIds validation depends on a valid teamId
				try {
					const team = await linearClient.team(teamId); // Re-fetch or assume teamId is validated
					if (!team) {
						const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
						throw new McpError(ErrorCode.InvalidParams, `Cannot validate labelIds: Team '${teamId}' not found.${availableTeamsMessage}`);
					}
					const teamLabels = await team.labels();
					const validLabelIds = teamLabels.nodes.map(label => label.id);
					const invalidLabelIds = labelIds.filter(labelId => !validLabelIds.includes(labelId));

					if (invalidLabelIds.length > 0) {
						const availableLabelsMessage = await getAvailableLabelsMessage(linearClient, teamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid labelId(s): '${invalidLabelIds.join(", ")}' for team '${team.name}' (${teamId}). Labels not found.${availableLabelsMessage}`
						);
					}
				} catch (error: unknown) {
					// Handle cases where the error is already an McpError (e.g. from getAvailableLabelsMessage if team not found)
					if (error instanceof McpError) {
						throw error;
					}
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableLabelsMessage = await getAvailableLabelsMessage(linearClient, teamId);
					let specificMessage = `Error validating labelId(s) for team '${teamId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						specificMessage = `${specificMessage} Error: ${err.message}`;
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during label validation.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage}${availableLabelsMessage}`
					);
				}
			} else if (labelIds && labelIds.length > 0 && !teamId) {
				const availableTeamsMessage = await getAvailableTeamsMessage(linearClient);
				throw new McpError(ErrorCode.InvalidParams, `Cannot validate labelIds: 'teamId' is required when 'labelIds' are provided.${availableTeamsMessage}`);
			}

			const issuePayload = await linearClient.createIssue(issueCreateInput);
			if (issuePayload.issue) {
				const createdIssue = await issuePayload.issue;
				const projectMilestoneEntity = await createdIssue.projectMilestone;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: createdIssue.id,
								identifier: createdIssue.identifier,
								title: createdIssue.title,
								url: createdIssue.url,
								projectMilestone: projectMilestoneEntity
									? { id: projectMilestoneEntity.id, name: projectMilestoneEntity.name }
									: null,
							}),
						},
					],
				};
			}
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to create issue: No issue returned",
			);
		} catch (error: unknown) {
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
				projectMilestoneId, // Added
				stateId,
				assigneeId,
				labelIds,
				dueDate,
			} = args;
			const issueUpdateInput: Record<string, unknown | null> = {};
			if (title !== undefined) issueUpdateInput.title = title;
			if (description !== undefined) issueUpdateInput.description = description;
			if (priority !== undefined) issueUpdateInput.priority = priority;
			// For projectId, allow setting to null to remove it
			if (projectId !== undefined) issueUpdateInput.projectId = projectId;


			// For projectMilestoneId, allow setting to null to remove it
			if (projectMilestoneId !== undefined) { // Check if the key exists in args
				issueUpdateInput.projectMilestoneId = projectMilestoneId;
			}

			if (stateId !== undefined) issueUpdateInput.stateId = stateId;
			if (assigneeId !== undefined) issueUpdateInput.assigneeId = assigneeId;
			if (labelIds !== undefined) issueUpdateInput.labelIds = labelIds;
			if (dueDate !== undefined) issueUpdateInput.dueDate = dueDate;
			const linearClient = getLinearClient();

			// Validate projectId if provided and not null
			// If projectId is explicitly set to null, it means unassigning the project, which is a valid operation.
			if (projectId) { // Only validate if projectId is truthy (not null or empty string)
				try {
					const project = await linearClient.project(projectId);
					if (!project) {
						const availableProjectsMessage = await getAvailableProjectsMessage(linearClient);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid projectId: '${projectId}'. Project not found.${availableProjectsMessage}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableProjectsMessage = await getAvailableProjectsMessage(linearClient);
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
						`${specificMessage}${availableProjectsMessage}`
					);
				}
			}

			// Validate stateId if provided
			if (stateId) {
				// First, we need the teamId of the issue being updated.
				const issueToUpdate = await linearClient.issue(id);
				if (!issueToUpdate) {
					throw new McpError(ErrorCode.MethodNotFound, `Cannot validate stateId: Issue with ID '${id}' not found.`);
				}
				const issueTeam = await issueToUpdate.team;
				if (!issueTeam) {
					throw new McpError(ErrorCode.InternalError, `Cannot validate stateId: Issue '${id}' does not have an associated team.`);
				}
				const currentTeamId = issueTeam.id;

				try {
					const team = await linearClient.team(currentTeamId); // Ensure team exists
					if (!team) {
						// Should not happen if issue has a team, but safeguard
						throw new McpError(ErrorCode.InternalError, `Cannot validate stateId: Team '${currentTeamId}' associated with issue '${id}' not found.`);
					}
					const states = await team.states({ filter: { id: { eq: stateId } } });
					if (!states.nodes || states.nodes.length === 0) {
						const availableStatesMessage = await getAvailableStatesMessage(linearClient, currentTeamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid stateId: '${stateId}' for team '${team.name}' (${currentTeamId}). State not found.${availableStatesMessage}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableStatesMessage = await getAvailableStatesMessage(linearClient, currentTeamId);
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
						`${specificMessage}${availableStatesMessage}`
					);
				}
			}

			// Validate assigneeId if provided and not null
			// If assigneeId is explicitly set to null, it means unassigning the user, which is a valid operation.
			if (assigneeId) { // Only validate if assigneeId is truthy
				try {
					const assignee = await linearClient.user(assigneeId);
					if (!assignee || !assignee.active) {
						const availableAssigneesMessage = await getAvailableAssigneesMessage(linearClient);
						let message = `Invalid assigneeId: '${assigneeId}'.`;
						if (!assignee) {
							message += " User not found.";
						} else if (!assignee.active) {
							message += ` User '${assignee.displayName}' (${assigneeId}) is not active.`;
						}
						throw new McpError(
							ErrorCode.InvalidParams,
							`${message}${availableAssigneesMessage}`
						);
					}
				} catch (error: unknown) {
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableAssigneesMessage = await getAvailableAssigneesMessage(linearClient);
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
						`${specificMessage}${availableAssigneesMessage}`
					);
				}
			}

			// Validate labelIds if provided
			if (labelIds && labelIds.length > 0) {
				// First, we need the teamId of the issue being updated.
				const issueToUpdate = await linearClient.issue(id);
				if (!issueToUpdate) {
					throw new McpError(ErrorCode.MethodNotFound, `Cannot validate labelIds: Issue with ID '${id}' not found.`);
				}
				const issueTeam = await issueToUpdate.team;
				if (!issueTeam) {
					throw new McpError(ErrorCode.InternalError, `Cannot validate labelIds: Issue '${id}' does not have an associated team.`);
				}
				const currentTeamId = issueTeam.id;

				try {
					const team = await linearClient.team(currentTeamId); // Ensure team exists
					if (!team) {
						throw new McpError(ErrorCode.InternalError, `Cannot validate labelIds: Team '${currentTeamId}' associated with issue '${id}' not found.`);
					}
					const teamLabels = await team.labels();
					const validLabelIds = teamLabels.nodes.map(label => label.id);
					const invalidLabelIds = labelIds.filter(labelId => !validLabelIds.includes(labelId));

					if (invalidLabelIds.length > 0) {
						const availableLabelsMessage = await getAvailableLabelsMessage(linearClient, currentTeamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid labelId(s): '${invalidLabelIds.join(", ")}' for team '${team.name}' (${currentTeamId}). Labels not found.${availableLabelsMessage}`
						);
					}
				} catch (error: unknown) {
					if (error instanceof McpError) {
						throw error;
					}
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableLabelsMessage = await getAvailableLabelsMessage(linearClient, currentTeamId);
					let specificMessage = `Error validating labelId(s) for team '${currentTeamId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						specificMessage = `${specificMessage} Error: ${err.message}`;
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during label validation.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage}${availableLabelsMessage}`
					);
				}
			}

			// Validate labelIds if provided
			if (labelIds && labelIds.length > 0) {
				// First, we need the teamId of the issue being updated.
				const issueToUpdate = await linearClient.issue(id);
				if (!issueToUpdate) {
					throw new McpError(ErrorCode.MethodNotFound, `Cannot validate labelIds: Issue with ID '${id}' not found.`);
				}
				const issueTeam = await issueToUpdate.team;
				if (!issueTeam) {
					throw new McpError(ErrorCode.InternalError, `Cannot validate labelIds: Issue '${id}' does not have an associated team.`);
				}
				const currentTeamId = issueTeam.id;

				try {
					const team = await linearClient.team(currentTeamId); // Ensure team exists
					if (!team) {
						throw new McpError(ErrorCode.InternalError, `Cannot validate labelIds: Team '${currentTeamId}' associated with issue '${id}' not found.`);
					}
					const teamLabels = await team.labels();
					const validLabelIds = teamLabels.nodes.map(label => label.id);
					const invalidLabelIds = labelIds.filter(labelId => !validLabelIds.includes(labelId));

					if (invalidLabelIds.length > 0) {
						const availableLabelsMessage = await getAvailableLabelsMessage(linearClient, currentTeamId);
						throw new McpError(
							ErrorCode.InvalidParams,
							`Invalid labelId(s): '${invalidLabelIds.join(", ")}' for team '${team.name}' (${currentTeamId}). Labels not found.${availableLabelsMessage}`
						);
					}
				} catch (error: unknown) {
					if (error instanceof McpError) {
						throw error;
					}
					const err = error as { message?: string; extensions?: { userPresentableMessage?: string } };
					const availableLabelsMessage = await getAvailableLabelsMessage(linearClient, currentTeamId);
					let specificMessage = `Error validating labelId(s) for team '${currentTeamId}'.`;
					if (err.extensions?.userPresentableMessage) {
						specificMessage = `${specificMessage} Details: ${err.extensions.userPresentableMessage}`;
					} else if (err.message) {
						specificMessage = `${specificMessage} Error: ${err.message}`;
					} else {
						specificMessage = `${specificMessage} An unknown error occurred during label validation.`;
					}
					throw new McpError(
						ErrorCode.InvalidParams,
						`${specificMessage}${availableLabelsMessage}`
					);
				}
			}

			const issuePayload = await linearClient.updateIssue(id, issueUpdateInput);
			if (issuePayload.issue) {
				const updatedIssue = await issuePayload.issue;
				const projectMilestoneEntity = await updatedIssue.projectMilestone;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: updatedIssue.id,
								identifier: updatedIssue.identifier,
								title: updatedIssue.title,
								url: updatedIssue.url,
								projectMilestone: projectMilestoneEntity
									? { id: projectMilestoneEntity.id, name: projectMilestoneEntity.name }
									: null,
							}),
						},
					],
				};
			}
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to update issue: No issue returned",
			);
		} catch (error: unknown) {
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
	inputSchema: {
		issueId: z.string().describe("The issue ID"),
	},
	handler: async ({ issueId }) => {
		const linearClient = getLinearClient();
		try {
			const issue: Issue | undefined = await linearClient.issue(issueId);
			if (!issue) {
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Issue with ID ${issueId} not found`,
				);
			}
			const comments = await issue.comments();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							comments.nodes.map((comment) => ({
								id: comment.id,
								body: comment.body,
								userId: comment.userId,
								createdAt: comment.createdAt,
								updatedAt: comment.updatedAt,
							})),
						),
					},
				],
			};
		} catch (error: unknown) {
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
		const linearClient = getLinearClient();
		try {
			const issue: Issue | undefined = await linearClient.issue(issueId);
			if (!issue) {
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Issue with ID ${issueId} not found`,
				);
			}
			const commentPayload = await linearClient.createComment({
				issueId,
				body,
			});
			if (commentPayload.comment) {
				const createdComment = await commentPayload.comment;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: createdComment.id,
								body: createdComment.body,
							}),
						},
					],
				};
			}
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to create comment: No comment returned",
			);
		} catch (error: unknown) {
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
		const linearClient = getLinearClient();
		try {
			const issue: Issue | undefined = await linearClient.issue(id);
			if (!issue) {
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Issue with ID ${id} not found`,
				);
			}
			const identifier = issue.identifier.toLowerCase();
			let title = issue.title || "";
			title = title
				.toLowerCase()
				.replace(/[^\w\s-]/g, "")
				.trim()
				.replace(/\s+/g, "-");
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							branchName: `${identifier}-${title}`,
							identifier: issue.identifier,
							title: issue.title,
						}),
					},
				],
			};
		} catch (error: unknown) {
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to get issue branch name: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const issueTools = {
	listIssuesTool,
	getIssueTool,
	createIssueTool,
	updateIssueTool,
	listCommentsTool,
	createCommentTool,
	getIssueGitBranchNameTool,
};
