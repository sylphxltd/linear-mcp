import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { WorkflowState } from '@linear/sdk';

// Types
export interface IssueStatusSummary {
  id: string;
  name: string;
  type: string;
}

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

// Helper Functions
export async function getAvailableStatusesMessage(states: WorkflowState[]): Promise<string> {
  const validStatuses = states.map((s): IssueStatusSummary => ({
    id: s.id,
    name: s.name,
    type: s.type,
  }));
  return ` Available statuses are: ${JSON.stringify(validStatuses, null, 2)}`;
}
