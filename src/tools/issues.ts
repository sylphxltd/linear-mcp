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
				includeArchived = true,
				limit = 50,
			} = args;
			const filters: IssueFilters = {};
			if (query)
				filters.filter = {
					or: [
						{ title: { containsIgnoreCase: query } },
						{ description: { containsIgnoreCase: query } },
					],
				};
			if (teamId) filters.teamId = teamId;
			if (stateId) filters.stateId = stateId;
			if (assigneeId) filters.assigneeId = assigneeId;
			const linearClient = getLinearClient();
			const issuesConnection = await linearClient.issues(
				filters as Parameters<typeof linearClient.issues>[0],
			);
			const issues = await Promise.all(
				issuesConnection.nodes.map(async (issueNode: Issue) => {
					const stateEntity = await issueNode.state;
					const assigneeEntity = await issueNode.assignee;
					return {
						id: issueNode.id,
						identifier: issueNode.identifier,
						title: issueNode.title,
						description: issueNode.description,
						priority: issueNode.priority,
						state: stateEntity?.name,
						assignee: assigneeEntity?.name,
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
			if (stateId) issueCreateInput.stateId = stateId;
			if (assigneeId) issueCreateInput.assigneeId = assigneeId;
			if (labelIds) issueCreateInput.labelIds = labelIds;
			if (dueDate) issueCreateInput.dueDate = dueDate;
			const linearClient = getLinearClient();
			const issuePayload = await linearClient.createIssue(issueCreateInput);
			if (issuePayload.issue) {
				const createdIssue = await issuePayload.issue;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: createdIssue.id,
								identifier: createdIssue.identifier,
								title: createdIssue.title,
								url: createdIssue.url,
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
				stateId,
				assigneeId,
				labelIds,
				dueDate,
			} = args;
			const issueUpdateInput: Record<string, unknown> = {};
			if (title !== undefined) issueUpdateInput.title = title;
			if (description !== undefined) issueUpdateInput.description = description;
			if (priority !== undefined) issueUpdateInput.priority = priority;
			if (projectId !== undefined) issueUpdateInput.projectId = projectId;
			if (stateId !== undefined) issueUpdateInput.stateId = stateId;
			if (assigneeId !== undefined) issueUpdateInput.assigneeId = assigneeId;
			if (labelIds !== undefined) issueUpdateInput.labelIds = labelIds;
			if (dueDate !== undefined) issueUpdateInput.dueDate = dueDate;
			const linearClient = getLinearClient();
			const issuePayload = await linearClient.updateIssue(id, issueUpdateInput);
			if (issuePayload.issue) {
				const updatedIssue = await issuePayload.issue;
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								id: updatedIssue.id,
								identifier: updatedIssue.identifier,
								title: updatedIssue.title,
								url: updatedIssue.url,
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
