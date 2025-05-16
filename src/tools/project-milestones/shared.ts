import type { LinearClient, Project, ProjectMilestone } from '@linear/sdk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

// Helper function to get available projects for error messages
export async function getAvailableProjectsJsonForError(linearClient: LinearClient): Promise<string> {
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