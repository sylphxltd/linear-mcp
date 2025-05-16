export { listUsersTool } from './users/list_users.js';
export { getUserTool } from './users/get_user.js';

export const userTools = {
  listUsersTool: (await import('./users/list_users.js')).listUsersTool,
  getUserTool: (await import('./users/get_user.js')).getUserTool,
};
