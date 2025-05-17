import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getLinearClient } from '../../utils/linear-client.js';
import { isEntityError } from '../shared/entity-error-handler.js';
import { defineTool } from '../shared/tool-definition.js';
import { IdSchema, mapIssueToDetails } from './shared.js';

export const getIssueTool = defineTool({
  name: 'get_issue',
  description: 'Retrieve a Linear issue details by ID, including attachments',
  inputSchema: IdSchema,
  handler: async ({ id }) => {
    const linearClient = getLinearClient();
    try {
      const issue = await linearClient.issue(id);
      // If issue is not found, linearClient.issue(id) will throw an error that should be
      // caught by the main catch block and handled by isEntityError if applicable.
      if (!issue) {
        // This case should ideally not be reached if linearClient.issue throws as expected.
        // If it does, it's an unexpected state.
        throw new Error(`Issue with ID '${id}' was unexpectedly not found and did not throw an error.`);
      }
      const detailedIssue = await mapIssueToDetails(issue, true);
      return { content: [{ type: 'text', text: JSON.stringify(detailedIssue) }] };
    } catch (error: unknown) {
      const err = error as Error;
      if (isEntityError(err.message)) {
        // For get_issue, if it's an entity error related to the issue ID itself,
        // providing a list of other issues might not be the most direct feedback,
        // but we follow the pattern.
        // A more specific list (e.g. recent issues) could be fetched if desired.
        throw new Error(`${err.message}\n(Context: Trying to fetch issue ID '${id}')`);
      }
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Error getting issue details for ID '${id}': ${err.message || 'Unknown error'}`,
      );
    }
  },
});
