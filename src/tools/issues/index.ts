import { createCommentTool } from './create_comment.js';
import { createIssueTool } from './create_issue.js';
import { getIssueGitBranchNameTool } from './get_issue_git_branch_name.js';
import { listCommentsTool } from './list_comments.js';
import { listIssuesTool } from './list_issues.js';
import { listMyIssuesTool } from './list_my_issues.js';
import { updateIssueTool } from './update_issue.js';

// Sub-issue management tools
import { listSubIssuesTool } from './list_sub_issues.js';
import { createSubIssueTool } from './create_sub_issue.js';
import { setIssueParentTool } from './set_issue_parent.js';
import { removeIssueParentTool } from './remove_issue_parent.js';

export const issueTools = [
  listIssuesTool,
  listMyIssuesTool,
  createCommentTool,
  createIssueTool,
  getIssueGitBranchNameTool,
  listCommentsTool,
  updateIssueTool,
  
  // Sub-issue management tools
  listSubIssuesTool,
  createSubIssueTool,
  setIssueParentTool,
  removeIssueParentTool,
];
