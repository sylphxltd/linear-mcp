export { listIssuesTool } from './issues/list_issues.js';
export { getIssueTool } from './issues/get_issue.js';
export { createIssueTool } from './issues/create_issue.js';
export { updateIssueTool } from './issues/update_issue.js';
export { listCommentsTool } from './issues/list_comments.js';
export { createCommentTool } from './issues/create_comment.js';
export { getIssueGitBranchNameTool } from './issues/get_issue_git_branch_name.js';

// Export all as array for registration
import { listIssuesTool } from './issues/list_issues.js';
import { getIssueTool } from './issues/get_issue.js';
import { createIssueTool } from './issues/create_issue.js';
import { updateIssueTool } from './issues/update_issue.js';
import { listCommentsTool } from './issues/list_comments.js';
import { createCommentTool } from './issues/create_comment.js';
import { getIssueGitBranchNameTool } from './issues/get_issue_git_branch_name.js';

export const issueTools = [
  listIssuesTool,
  getIssueTool,
  createIssueTool,
  updateIssueTool,
  listCommentsTool,
  createCommentTool,
  getIssueGitBranchNameTool,
];
