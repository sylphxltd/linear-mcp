import { createCommentTool } from './create_comment.js';
import { createIssueTool } from './create_issue.js';
import { getIssueTool } from './get_issue.js';
import { getIssueGitBranchNameTool } from './get_issue_git_branch_name.js';
import { listCommentsTool } from './list_comments.js';
import { listIssuesTool } from './list_issues.js';
import { listMyIssuesTool } from './list_my_issues.js';
import { updateIssueTool } from './update_issue.js';

export const issueTools = [
  listIssuesTool,
  listMyIssuesTool,
  createCommentTool,
  createIssueTool,
  getIssueGitBranchNameTool,
  getIssueTool,
  listCommentsTool,
  updateIssueTool,
];
