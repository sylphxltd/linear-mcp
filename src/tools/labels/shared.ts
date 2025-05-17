import type { Issue, IssueLabel, Team } from '@linear/sdk';
import type { LinearClient } from '@linear/sdk';
import { z } from 'zod';

// --- Tool definition utility (local copy) ---

// --- Label schemas (local copy) ---
export const LabelListSchema = {
  teamId: z.string().describe('The team UUID'),
};

/**
 * getAvailableTeamsMessage removed.
 * Tools should import getAvailableTeamsJson from '../shared/entity-error-handler.js'
 */

/**
 * Formats an array of label nodes for output.
 */
export function formatLabelNodes(labels: IssueLabel[]): object[] {
  return labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description,
    createdAt:
      label.createdAt instanceof Date
        ? label.createdAt.toISOString()
        : typeof label.createdAt === 'string'
          ? label.createdAt
          : undefined,
    updatedAt:
      label.updatedAt instanceof Date
        ? label.updatedAt.toISOString()
        : typeof label.updatedAt === 'string'
          ? label.updatedAt
          : undefined,
  }));
}
