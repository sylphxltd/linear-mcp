import type { IssueLabel } from '@linear/sdk';
import { getAvailableTeamsMessage } from '../teams/shared.js';

export interface LabelOutput {
  id: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export function mapLabelToOutput(label: IssueLabel): LabelOutput {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description ?? null,
    createdAt: label.createdAt instanceof Date ? label.createdAt.toISOString() : label.createdAt,
    updatedAt: label.updatedAt instanceof Date ? label.updatedAt.toISOString() : label.updatedAt,
  };
}

export { getAvailableTeamsMessage };
