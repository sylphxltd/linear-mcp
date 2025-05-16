export { listIssueLabelsTool } from './labels/list_issue_labels.js';

export const labelTools = {
  list_issue_labels: (await import('./labels/list_issue_labels.js')).listIssueLabelsTool,
};
