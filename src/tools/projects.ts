import { listProjectsTool } from './projects/list_projects.js';
import { getProjectTool } from './projects/get_project.js';
import { createProjectTool } from './projects/create_project.js';
import { updateProjectTool } from './projects/update_project.js';

export { listProjectsTool } from './projects/list_projects.js';
export { getProjectTool } from './projects/get_project.js';
export { createProjectTool } from './projects/create_project.js';
export { updateProjectTool } from './projects/update_project.js';

export const projectTools = {
  listProjectsTool,
  getProjectTool,
  createProjectTool,
  updateProjectTool,
};
