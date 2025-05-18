import type { Project, LinearClient } from '@linear/sdk';

export interface ProjectSummary {
  id: string;
  name: string;
  state: string;
}

export type ProjectOutput = {
  id: string;
  name: string;
  description: string | null;
  content: string | null;
  icon: string | null;
  color: string | null;
  state: string;
  startDate: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
};

// --- Project mappers ---
export const mapProjectToOutput = (project: Project): ProjectOutput => ({
  id: project.id,
  name: project.name,
  description: project.description ?? null,
  content: project.content ?? null,
  icon: project.icon ?? null,
  color: project.color ?? null,
  state: project.state,
  startDate: project.startDate ?? null,
  targetDate: project.targetDate ?? null,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
  url: project.url,
});

// Helper function to get available projects list
export async function getAvailableProjectsMessage(linearClient: LinearClient): Promise<string> {
  try {
    const projects = await linearClient.projects();
    if (!projects.nodes || projects.nodes.length === 0) {
      return ' No projects available.';
    }
    const projectList = projects.nodes.map((p): ProjectSummary => ({
      id: p.id,
      name: p.name,
      state: p.state,
    }));
    return ` Available projects are: ${JSON.stringify(projectList, null, 2)}`;
  } catch (error) {
    return ` (Could not fetch available projects: ${(error as Error).message})`;
  }
}
