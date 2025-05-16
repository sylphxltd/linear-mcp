import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { LabelListSchema, defineTool } from "../schemas/index.js";
import { getLinearClient } from "../utils/linear-client.js";

export const listIssueLabelsTools = defineTool({
	name: "list_issue_labels",
	description: "List available issue labels in a Linear team",
	inputSchema: LabelListSchema,
	handler: async ({ teamId }) => {
		const linearClient = getLinearClient();
		try {
			const team = await linearClient.team(teamId);
			if (!team) {
				let availableTeamsMessage = "";
				try {
					const allTeams = await linearClient.teams();
					if (allTeams.nodes.length > 0) {
						const teamList = allTeams.nodes.map(t => ({ id: t.id, name: t.name }));
						availableTeamsMessage = ` Valid teams are: ${JSON.stringify(teamList, null, 2)}`;
					} else {
						availableTeamsMessage = " No teams available to list.";
					}
				} catch (listError) {
					availableTeamsMessage = " (Could not fetch available teams for context.)";
				}
				throw new McpError(
					ErrorCode.InvalidParams,
					`Team with ID '${teamId}' not found when trying to list labels.${availableTeamsMessage}`
				);
			}
			const labels = await team.labels();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							labels.nodes.map((label) => ({
								id: label.id,
								name: label.name,
								color: label.color,
								description: label.description,
								createdAt: label.createdAt,
								updatedAt: label.updatedAt,
							})),
						),
					},
				],
			};
		} catch (error: unknown) {
			const err = error as { message?: string };
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to list issue labels: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const labelTools = {
	listIssueLabelsTools,
};
