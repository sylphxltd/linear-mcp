import type { Project } from '@linear/sdk';

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
