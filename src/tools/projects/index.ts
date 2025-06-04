import { createProjectTool } from './create_project.js';
import { listProjectsTool } from './list_projects.js';
import { updateProjectTool } from './update_project.js';

// Project update tools
import { listProjectUpdatesTool } from './list_project_updates.js';
import { createProjectUpdateTool } from './create_project_update.js';
import { updateProjectUpdateTool } from './update_project_update.js';
import { getProjectUpdateTool } from './get_project_update.js';

export const projectTools = [
  createProjectTool,
  listProjectsTool,
  updateProjectTool,
  
  // Project update tools
  listProjectUpdatesTool,
  createProjectUpdateTool,
  updateProjectUpdateTool,
  getProjectUpdateTool,
];
