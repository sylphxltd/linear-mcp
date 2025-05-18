import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { WorkflowState } from '@linear/sdk';

// Types
export interface IssueStatusOutput {
  id: string;
  name: string;
  color: string;
  type: string;
  description: string | null;
  position: number;
}

// Mappers
export function mapIssueStatusToOutput(status: WorkflowState): IssueStatusOutput {
  return {
    id: status.id,
    name: status.name,
    color: status.color,
    type: status.type,
    description: status.description ?? null,
    position: status.position,
  };
}

// Error Handlers
export function throwInternalError(message: string, error: unknown): never {
  const err = error as { message?: string };
  throw new McpError(ErrorCode.InternalError, `${message}: ${err.message || 'Unknown error'}`);
}
