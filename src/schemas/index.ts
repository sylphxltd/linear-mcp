import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export interface ToolDefinition<T extends z.ZodRawShape = z.ZodRawShape> {
	name: string;
	description: string;
	inputSchema: T;
	handler: ToolCallback<T>; // Return Promise<unknown> for better type safety
}

export const defineTool = <T extends z.ZodRawShape>(
	tool: ToolDefinition<T>,
): ToolDefinition<T> => {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
		handler: tool.handler,
	};
};

// Common schemas
export const IdSchema = {
	id: z.string().describe("The issue ID"),
};

export const PaginationSchema = {
	limit: z.number().default(50).describe("The number of items to return"),
	before: z.string().optional().describe("A UUID to end at"),
	after: z.string().optional().describe("A UUID to start from"),
	orderBy: z.enum(["createdAt", "updatedAt"]).default("updatedAt"),
};

// Issue schemas
export const IssueFilterSchema = {
	query: z.string().optional().describe("An optional search query"),
	teamId: z.string().optional().describe("The team UUID"),
	stateId: z.string().optional().describe("The state UUID"),
	assigneeId: z.string().optional().describe("The assignee UUID"),
	cycleId: z.string().optional().describe("The cycle UUID to filter by"),
	includeArchived: z
		.boolean()
		.default(true)
		.describe("Whether to include archived issues"),
	limit: z.number().default(50).describe("The number of issues to return"),
};

export const IssueCreateSchema = {
	title: z.string().describe("The issue title"),
	description: z
		.string()
		.optional()
		.describe("The issue description as Markdown"),
	teamId: z.string().describe("The team UUID"),
	priority: z
		.number()
		.optional()
		.describe(
			"The issue priority. 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low.",
		),
	projectId: z
		.string()
		.optional()
		.describe("The project ID to add the issue to"),
	stateId: z.string().optional().describe("The issue state ID"),
	assigneeId: z.string().optional().describe("The assignee ID"),
	labelIds: z
		.array(z.string())
		.optional()
		.describe("Array of label IDs to set on the issue"),
	dueDate: z
		.string()
		.optional()
		.describe("The due date for the issue in ISO format"),
	cycleId: z.string().optional().describe("The cycle ID to assign the issue to"),
};

export const IssueUpdateSchema = {
	id: z.string().describe("The issue ID"),
	title: z.string().optional().describe("The issue title"),
	description: z
		.string()
		.optional()
		.describe("The issue description as Markdown"),
	priority: z
		.number()
		.optional()
		.describe(
			"The issue priority. 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low.",
		),
	projectId: z
		.string()
		.optional()
		.describe("The project ID to add the issue to"),
	stateId: z.string().optional().describe("The issue state ID"),
	assigneeId: z.string().optional().describe("The assignee ID"),
	labelIds: z
		.array(z.string())
		.optional()
		.describe("Array of label IDs to set on the issue"),
	dueDate: z
		.string()
		.optional()
		.describe("The due date for the issue in ISO format"),
	cycleId: z
		.string()
		.optional()
		.nullable()
		.describe(
			"The cycle ID to assign the issue to. Pass null to remove from cycle.",
		),
};

export const CommentCreateSchema = {
	issueId: z.string().describe("The issue ID"),
	body: z.string().describe("The content of the comment as Markdown"),
};

// Project schemas
export const ProjectFilterSchema = {
	limit: z.number().default(50).describe("The number of items to return"),
	before: z.string().optional().describe("A UUID to end at"),
	after: z.string().optional().describe("A UUID to start from"),
	orderBy: z.enum(["createdAt", "updatedAt"]).default("updatedAt"),
	includeArchived: z
		.boolean()
		.default(false)
		.describe("Whether to include archived projects"),
	teamId: z.string().optional().describe("A team UUID to filter by"),
};

export const ProjectQuerySchema = {
	query: z.string().describe("The ID or name of the project to retrieve"),
};

export const ProjectCreateSchema = {
	name: z.string().describe("A descriptive name of the project"),
	description: z
		.string()
		.optional()
		.describe("The description of the project as Markdown"),
	content: z
		.string()
		.optional()
		.describe("The content of the project as Markdown"),
	startDate: z
		.string()
		.optional()
		.describe("The start date of the project in ISO format"),
	targetDate: z
		.string()
		.optional()
		.describe("The target date of the project in ISO format"),
	teamIds: z
		.array(z.string())
		.describe("The UUIDs of the teams to associate the project with"),
};

export const ProjectUpdateSchema = {
	id: z.string().describe("The ID of the project to update"),
	name: z.string().optional().describe("The new name of the project"),
	description: z
		.string()
		.optional()
		.describe("The new description of the project as Markdown"),
	content: z
		.string()
		.optional()
		.describe("The content of the project as Markdown"),
	startDate: z
		.string()
		.optional()
		.describe("The start date of the project in ISO format"),
	targetDate: z
		.string()
		.optional()
		.describe("The target date of the project in ISO format"),
};

// Team schemas
export const TeamQuerySchema = {
	query: z.string().describe("The UUID or name of the team to retrieve"),
};

// User schemas
export const UserQuerySchema = {
	query: z.string().describe("The UUID or name of the user to retrieve"),
};

// Issue status schemas
export const IssueStatusListSchema = {
	teamId: z.string().describe("The team UUID"),
};

export const IssueStatusQuerySchema = {
	query: z
		.string()
		.describe("The UUID or name of the issue status to retrieve"),
	teamId: z.string().describe("The team UUID"),
};

// Label schemas
export const LabelListSchema = {
	teamId: z.string().describe("The team UUID"),
};

// Documentation schemas section removed
