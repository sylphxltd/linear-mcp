export { listIssueStatusesTool } from './issue-statuses/list_issue_statuses.js';
export { getIssueStatusTool } from './issue-statuses/get_issue_status.js';

export const issueStatusTools = {
  list_issue_statuses: (await import('./issue-statuses/list_issue_statuses.js')).listIssueStatusesTool,
  get_issue_status: (await import('./issue-statuses/get_issue_status.js')).getIssueStatusTool,
};
