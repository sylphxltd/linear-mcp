import { type Cycle, LinearError, type Team } from "@linear/sdk";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { defineTool } from "../schemas/index.js";
import { getLinearClient } from "../utils/linear-client.js";

const ListCyclesInputSchema = z.object({
	limit: z
		.number()
		.optional()
		.default(50)
		.describe("The number of cycles to return"),
	before: z.string().optional().describe("A UUID to end at"),
	after: z.string().optional().describe("A UUID to start from"),
	orderBy: z
		.enum(["createdAt", "updatedAt", "startsAt", "endsAt"])
		.optional()
		// .default('endsAt') // SDK might not support default for all orderings or this specific one in filters
		.describe(
			"The field to order by. Note: API behavior for orderBy can vary.",
		),
	includeArchived: z
		.boolean()
		.optional()
		.default(false)
		.describe("Whether to include archived cycles"),
	teamId: z.string().optional().describe("A team UUID to filter by"),
});

const GetCycleInputSchema = z.object({
	id: z.string().describe("The cycle ID"),
});

const CreateCycleInputSchema = z.object({
	name: z.string().describe("The name of the cycle"),
	description: z
		.string()
		.optional()
		.describe("The description of the cycle as Markdown"),
	startsAt: z
		.string()
		.datetime({ message: "Invalid datetime string! Must be UTC ISO8601" })
		.describe(
			"The start date of the cycle in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)",
		),
	endsAt: z
		.string()
		.datetime({ message: "Invalid datetime string! Must be UTC ISO8601" })
		.describe(
			"The end date of the cycle in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)",
		),
	teamId: z
		.string()
		.describe("The UUID of the team to associate the cycle with"),
});

const UpdateCycleInputSchema = z.object({
	id: z.string().describe("The ID of the cycle to update"),
	name: z.string().optional().describe("The new name of the cycle"),
	description: z
		.string()
		.optional()
		.describe("The new description of the cycle as Markdown"),
	startsAt: z
		.string()
		.datetime({ message: "Invalid datetime string! Must be UTC ISO8601" })
		.optional()
		.describe(
			"The start date of the cycle in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)",
		),
	endsAt: z
		.string()
		.datetime({ message: "Invalid datetime string! Must be UTC ISO8601" })
		.optional()
		.describe(
			"The end date of the cycle in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)",
		),
});

const mapCycleToOutput = async (cycle: Cycle) => {
	let teamData: { id: string; name: string; key: string } | undefined;
	try {
		const team = await cycle.team;
		if (team) {
			teamData = { id: team.id, name: team.name, key: team.key };
		}
	} catch (e) {
		// If team fetching fails or is not available, proceed without it
	}

	return {
		id: cycle.id,
		name: cycle.name,
		description: cycle.description,
		number: cycle.number,
		startsAt: cycle.startsAt.toISOString(),
		endsAt: cycle.endsAt.toISOString(),
		completedAt: cycle.completedAt?.toISOString(),
		progress: cycle.progress,
		issueCountHistory: cycle.issueCountHistory,
		scopeHistory: cycle.scopeHistory,
		uncompletedIssuesUponClose: cycle.uncompletedIssuesUponClose,
		// url: cycle.url, // Property 'url' does not exist on type 'Cycle' or is not consistently available.
		team: teamData,
		createdAt: cycle.createdAt.toISOString(),
		updatedAt: cycle.updatedAt.toISOString(),
	};
};

export const listCyclesTool = defineTool({
	name: "list_cycles",
	description: "List cycles in the user's Linear workspace",
	inputSchema: ListCyclesInputSchema.shape,
	handler: async (args) => {
		const client = getLinearClient();
		const { limit, before, after, orderBy, includeArchived, teamId } = args;

		const filters: Record<string, unknown> = {
			first: limit,
		};
		if (before) filters.before = before;
		if (after) filters.after = after;
		if (orderBy) filters.orderBy = orderBy;

		const queryFilters: Record<string, unknown> = {};
		if (teamId) queryFilters.team = { id: { eq: teamId } };
		if (includeArchived === false) {
			queryFilters.completedAt = { null: true };
			queryFilters.archivedAt = { null: true };
		}
		if (Object.keys(queryFilters).length > 0) {
			filters.filter = queryFilters;
		}

		try {
			const cyclesConnection = await client.cycles(filters);
			const cycles = await Promise.all(
				cyclesConnection.nodes.map(mapCycleToOutput),
			);
			return {
				content: [{ type: "text", text: JSON.stringify(cycles) }],
			};
		} catch (error: unknown) {
			const err = error as { message?: string };
			if (error instanceof LinearError) {
				throw new McpError(
					ErrorCode.InternalError,
					`Linear API Error in list_cycles: ${err.message || "Unknown Linear error"}`,
				);
			}
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to list cycles: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const getCycleTool = defineTool({
	name: "get_cycle",
	description: "Retrieve details of a specific cycle in Linear",
	inputSchema: GetCycleInputSchema.shape,
	handler: async (args) => {
		const client = getLinearClient();
		const { id } = args;

		try {
			const cycle = await client.cycle(id);
			if (!cycle) {
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Cycle with ID "${id}" not found.`,
				);
			}
			const outputCycle = await mapCycleToOutput(cycle);
			return {
				content: [{ type: "text", text: JSON.stringify(outputCycle) }],
			};
		} catch (error: unknown) {
			const err = error as { message?: string };
			if (error instanceof McpError && error.code === ErrorCode.MethodNotFound)
				throw error;
			if (error instanceof LinearError) {
				throw new McpError(
					ErrorCode.InternalError,
					`Linear API Error in get_cycle: ${err.message || "Unknown Linear error"}`,
				);
			}
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to get cycle: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const createCycleTool = defineTool({
	name: "create_cycle",
	description: "Create a new cycle in Linear",
	inputSchema: CreateCycleInputSchema.shape,
	handler: async (args) => {
		const client = getLinearClient();
		const { name, description, startsAt, endsAt, teamId } = args;

		try {
			const result = await client.createCycle({
				name,
				description,
				startsAt: new Date(startsAt),
				endsAt: new Date(endsAt),
				teamId,
			});
			const createdCycle = await result.cycle;
			if (!createdCycle) {
				throw new McpError(
					ErrorCode.InternalError,
					"Failed to create cycle or retrieve created cycle.",
				);
			}
			const outputCycle = await mapCycleToOutput(createdCycle);
			return {
				content: [{ type: "text", text: JSON.stringify(outputCycle) }],
			};
		} catch (error: unknown) {
			const err = error as { message?: string };
			if (error instanceof McpError && error.code === ErrorCode.InternalError)
				throw error; // Assuming ApiOperationFailed maps to InternalError
			if (error instanceof LinearError) {
				throw new McpError(
					ErrorCode.InternalError,
					`Linear API Error in create_cycle: ${err.message || "Unknown Linear error"}`,
				);
			}
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to create cycle: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const updateCycleTool = defineTool({
	name: "update_cycle",
	description: "Update an existing Linear cycle",
	inputSchema: UpdateCycleInputSchema.shape,
	handler: async (args) => {
		const client = getLinearClient();
		const { id, ...updatePayload } = args;

		const payload: {
			name?: string;
			description?: string;
			startsAt?: Date;
			endsAt?: Date;
		} = {};

		if (updatePayload.name) payload.name = updatePayload.name;
		if (updatePayload.description)
			payload.description = updatePayload.description;
		if (updatePayload.startsAt)
			payload.startsAt = new Date(updatePayload.startsAt);
		if (updatePayload.endsAt) payload.endsAt = new Date(updatePayload.endsAt);

		if (Object.keys(payload).length === 0) {
			throw new McpError(
				ErrorCode.InternalError,
				"No update parameters provided for the cycle.",
			); // Assuming BadRequest maps to InternalError
		}

		try {
			const result = await client.updateCycle(id, payload);
			const updatedCycle = await result.cycle;
			if (!updatedCycle) {
				throw new McpError(
					ErrorCode.InternalError,
					`Failed to update cycle with ID "${id}" or retrieve updated cycle.`,
				);
			}
			const outputCycle = await mapCycleToOutput(updatedCycle);
			return {
				content: [{ type: "text", text: JSON.stringify(outputCycle) }],
			};
		} catch (error: unknown) {
			const err = error as { message?: string };
			if (error instanceof McpError) throw error;
			if (error instanceof LinearError) {
				throw new McpError(
					ErrorCode.InternalError,
					`Linear API Error in update_cycle: ${err.message || "Unknown Linear error"}`,
				);
			}
			throw new McpError(
				ErrorCode.InternalError,
				`Failed to update cycle: ${err.message || "Unknown error"}`,
			);
		}
	},
});

export const cycleTools = {
	listCyclesTool,
	getCycleTool,
	createCycleTool,
	updateCycleTool,
};
