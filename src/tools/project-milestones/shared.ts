import type { LinearClient, Project, ProjectMilestone } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// --- Tool definition utility (local copy) ---

// --- Project Milestone schemas (local copy) ---
export const ListProjectMilestonesInputSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});
export const CreateProjectMilestoneInputSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  name: z.string().min(1, 'Milestone name cannot be empty'),
  description: z.string().optional(),
  targetDate: z.string().datetime({ message: 'Invalid ISO date string for targetDate' }).optional(),
});
export const UpdateProjectMilestoneInputSchema = z.object({
  milestoneId: z.string().uuid('Invalid milestone ID'),
  name: z.string().min(1, 'Milestone name cannot be empty').optional(),
  description: z.string().optional(),
  targetDate: z.string().datetime({ message: 'Invalid ISO date string for targetDate' }).optional(),
});
export const DeleteProjectMilestoneInputSchema = z.object({
  milestoneId: z.string().uuid('Invalid milestone ID'),
});

// Helper function getAvailableProjectsJsonForError removed.
// Tools should import getAvailableProjectsJson from '../shared/entity-error-handler.js'
