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

export function throwInternalError(message: string, error: unknown): never {
  const err = error as { message?: string };
  throw new McpError(ErrorCode.InternalError, `${message}: ${err.message || 'Unknown error'}`);
}
