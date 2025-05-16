import { createProjectTool } from './create_project.js';
import { getProjectTool } from './get_project.js';
import { listProjectsTool } from './list_projects.js';
import { updateProjectTool } from './update_project.js';

export const projectTools = [
  createProjectTool,
  getProjectTool,
  listProjectsTool,
  updateProjectTool,
];