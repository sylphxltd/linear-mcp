import { createProjectMilestoneTool } from './create_project_milestone.js';
import { deleteProjectMilestoneTool } from './delete_project_milestone.js';
import { listProjectMilestonesTool } from './list_project_milestones.js';
import { updateProjectMilestoneTool } from './update_project_milestone.js';

export const projectMilestoneTools = [
  createProjectMilestoneTool,
  deleteProjectMilestoneTool,
  listProjectMilestonesTool,
  updateProjectMilestoneTool,
];
