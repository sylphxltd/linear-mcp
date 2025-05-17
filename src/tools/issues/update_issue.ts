import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import {
  getAvailableAssigneesJson,
  getAvailableLabelsJson,
  getAvailableProjectMilestonesJson,
  getAvailableProjectsJson,
  getAvailableStatesJson,
  getAvailableTeamsJson,
  isEntityError,
} from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { IssueUpdateSchema, mapIssueToDetails } from './shared.js';

export const updateIssueTool = defineTool({
  name: 'update_issue',
  description: 'Update an existing Linear issue',
  inputSchema: IssueUpdateSchema,
  handler: async (inputParams) => {
    const {
      id,
      // title, description, priority, dueDate are destructured but passed via inputParams to buildUpdatePayload
      projectId,
      stateId,
      assigneeId,
      labelIds,
      projectMilestoneId,
    } = inputParams;
    const linearClient = getLinearClient();

    // Construct update payload with only defined fields
    const updatePayload = buildUpdatePayload(inputParams);

    let currentTeamIdForContext: string | undefined;
    let currentProjectIdForContext: string | undefined;

    try {
      // Attempt to fetch the issue first to get context if needed for error reporting
      // This also implicitly checks if the issue exists.
      try {
        const issueForContext = await linearClient.issue(id);
        if (issueForContext) {
          currentTeamIdForContext = (await issueForContext.team)?.id;
          currentProjectIdForContext = (await issueForContext.project)?.id;
        } else {
          // If issue not found here, updateIssue will likely fail with a similar error.
          // We let it fail there to centralize error handling for the main operation.
        }
      } catch (_fetchError) {
        // Ignore error here, primary error handling is for the updateIssue call.
        // This pre-fetch is best-effort for richer error messages.
      }

      const issueUpdate = await linearClient.updateIssue(id, updatePayload);
      const updatedIssue = await issueUpdate.issue;

      if (!updatedIssue) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to update issue or retrieve details. Sync ID: ${issueUpdate.lastSyncId}`,
        );
      }

      const detailedUpdatedIssue = await mapIssueToDetails(updatedIssue, false);
      return { content: [{ type: 'text', text: JSON.stringify(detailedUpdatedIssue) }] };
    } catch (error: unknown) {
      const err = error as Error;
      if (isEntityError(err.message)) {
        let availableEntitiesJson = '[]';
        const msgLower = err.message.toLowerCase();

        // Use the specific ID from input if it caused the error,
        // otherwise, it might be a general validation error for the entity type.
        if (msgLower.includes('team')) {
          availableEntitiesJson = await getAvailableTeamsJson(linearClient);
        } else if (msgLower.includes('project') && (msgLower.includes(projectId || 'null') || !projectId)) {
          availableEntitiesJson = await getAvailableProjectsJson(linearClient);
        } else if (msgLower.includes('state') && (msgLower.includes(stateId || 'null') || !stateId)) {
          availableEntitiesJson = await getAvailableStatesJson(linearClient, { teamId: currentTeamIdForContext });
        } else if (msgLower.includes('assignee') && (msgLower.includes(assigneeId || 'null') || !assigneeId)) {
          availableEntitiesJson = await getAvailableAssigneesJson(linearClient);
        } else if (msgLower.includes('label') && (labelIds?.some(lid => msgLower.includes(lid)) || !labelIds)) {
          availableEntitiesJson = await getAvailableLabelsJson(linearClient, { teamId: currentTeamIdForContext });
        } else if (msgLower.includes('milestone') && (msgLower.includes(projectMilestoneId || 'null') || projectMilestoneId === null || !projectMilestoneId)) {
          availableEntitiesJson = await getAvailableProjectMilestonesJson(linearClient, { projectId: projectId ?? currentProjectIdForContext });
        } else if (msgLower.includes('issue') && msgLower.includes(id)) {
          // Generic "issue not found" or similar, less likely to have specific sub-entity lists.
          // Could list recent issues if desired, but keeping it simple for now.
          availableEntitiesJson = `(No specific list for general issue error, check ID: ${id})`;
        }
        throw new Error(`${err.message}\nAvailable: ${availableEntitiesJson}`);
      }
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error updating issue '${id}': ${err.message || 'Unknown error'}`,
      );
    }
  },
});

/**
 * Input parameters for building update payload
 */
interface UpdatePayloadParams {
  id: string; // id is part of input, but not directly in Linear's updateIssue payload body
  title?: string;
  description?: string;
  priority?: number;
  projectId?: string;
  stateId?: string;
  assigneeId?: string;
  labelIds?: string[];
  dueDate?: string;
  projectMilestoneId?: string | null;
  // Need to include teamId for context in error handling, even if not in payload
  teamId?: string;
}

/**
 * Builds the update payload with only defined fields
 */
function buildUpdatePayload(params: UpdatePayloadParams): Record<string, unknown> {
  const {
    title,
    description,
    priority,
    projectId,
    stateId,
    assigneeId,
    labelIds,
    dueDate,
    projectMilestoneId,
  } = params;
  return {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(priority !== undefined && { priority }),
    ...(projectId !== undefined && { projectId }),
    ...(stateId !== undefined && { stateId }),
    ...(assigneeId !== undefined && { assigneeId }),
    ...(labelIds !== undefined && { labelIds }),
    ...(dueDate !== undefined && { dueDate }),
    // Explicitly handle null for projectMilestoneId to remove it
    ...(projectMilestoneId !== undefined && { projectMilestoneId }),
  };
}
