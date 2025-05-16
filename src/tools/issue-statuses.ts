import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
	IssueStatusListSchema,
	IssueStatusQuerySchema,
	defineTool,
} from "../schemas/index.js";
import { getLinearClient } from "../utils/linear-client.js";

export const listIssueStatusesTool = defineTool({
	name: "list_issue_statuses",
	description: "List available issues statuses in a Linear team",
	inputSchema: IssueStatusListSchema,
	handler: async ({ teamId }) => {
		const linearClient = getLinearClient();
		try {
			const team = await linearClient.team(teamId);
			if (!team) {
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Team with ID ${teamId} not found`,
				);
			}
			const states = await team.states();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							states.nodes.map((state) => ({
								id: state.id,
								name: state.name,
								color: state.color,
								type: state.type,
								description: state.description,
								position: state.position,
							})),
						),
					},
				],
			};
		} catch (error: unknown) {
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to list issue statuses: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const getIssueStatusTool = defineTool({
	name: "get_issue_status",
	description:
		"Retrieve details of a specific issue status in Linear by name or ID",
	inputSchema: IssueStatusQuerySchema,
	handler: async ({ query, teamId }) => {
		const linearClient = getLinearClient();
		try {
			const team = await linearClient.team(teamId);
			if (!team) {
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Team with ID ${teamId} not found`,
				);
			}
			const states = await team.states();
			let state = states.nodes.find((s) => s.id === query);
			if (!state) {
				state = states.nodes.find(
					(s) => s.name.toLowerCase() === query.toLowerCase(),
				);
			}
			if (state) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: state.id,
								name: state.name,
								color: state.color,
								type: state.type,
								description: state.description,
								position: state.position,
							}),
						},
					],
				};
			}
			throw new McpError(
				ErrorCode.MethodNotFound,
				`Issue status with ID or name "${query}" not found in team ${teamId}`,
			);
		} catch (error: unknown) {
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to get issue status: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const issueStatusTools = {
	list_issue_statuses: listIssueStatusesTool,
	get_issue_status: getIssueStatusTool,
};
