import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLinearClient } from '../../utils/linear-client.js';

// --- Tool definition utility (local copy) ---

// --- Issue Status schemas (local copy) ---
export const IssueStatusListSchema = {
  teamId: z.string().describe('The team UUID'),
};
export const IssueStatusQuerySchema = {
  query: z.string().describe('The UUID or name of the issue status to retrieve'),
  teamId: z.string().describe('The team UUID'),
};

// Validation and error helper functions (validateTeamOrThrow, throwInternalError)
// have been removed as per new instructions.
// Error handling will be done directly in tool handlers using isEntityError
// and getAvailable<Entity>Json from entity-error-handler.ts.
