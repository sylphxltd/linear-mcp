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
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Team with ID ${teamId} not found`,
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
