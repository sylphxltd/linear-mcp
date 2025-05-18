import type { ProjectMilestone } from '@linear/sdk';
import type { LinearClient } from '@linear/sdk';

// Types
export interface ProjectMilestoneOutput {
  id: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  sortOrder: number;
  projectId: string | null;
}

// Mappers
export function mapMilestoneToOutput(milestone: ProjectMilestone): ProjectMilestoneOutput {
  return {
    id: milestone.id,
    name: milestone.name,
    description: milestone.description ?? null,
    targetDate: milestone.targetDate ?? null,
    sortOrder: milestone.sortOrder,
    projectId: milestone.projectId ?? null,
  };
}

// Helper Functions
export async function getAvailableProjectsJsonForError(
  linearClient: LinearClient,
): Promise<string> {
  try {
    const projects = await linearClient.projects();
    if (!projects.nodes || projects.nodes.length === 0) {
      return '[]';
    }
    const projectList = projects.nodes.map((p) => ({ id: p.id, name: p.name }));
    return JSON.stringify(projectList, null, 2);
  } catch (e) {
    const error = e as Error;
    return `(Could not fetch available projects for context: ${error.message})`;
  }
}