import { listProjectMilestonesTool } from './project-milestones/list_project_milestones.js';
import { createProjectMilestoneTool } from './project-milestones/create_project_milestone.js';
import { updateProjectMilestoneTool } from './project-milestones/update_project_milestone.js';
import { deleteProjectMilestoneTool } from './project-milestones/delete_project_milestone.js';

export {
  listProjectMilestonesTool,
  createProjectMilestoneTool,
  updateProjectMilestoneTool,
  deleteProjectMilestoneTool,
};

export const projectMilestoneTools = {
  listProjectMilestonesTool,
  createProjectMilestoneTool,
  updateProjectMilestoneTool,
  deleteProjectMilestoneTool,
};
