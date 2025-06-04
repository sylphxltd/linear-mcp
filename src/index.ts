#!/usr/bin/env node

import { McpServer, type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
// import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Re-export McpError for use in other files
export { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Log the available ErrorCode values for debugging
// console.log('Available ErrorCode values:', Object.keys(ErrorCode));

// Import Linear client
import { LinearClientManager } from './utils/linear-client.js';

import { issueStatusTools } from './tools/issue-statuses/index.js';
import { issueTools } from './tools/issues/index.js';
import { labelTools } from './tools/labels/index.js';
// import { myIssuesTools } from './tools/my-issues.js'; // Duplicate - list_my_issues is already in issueTools
import { projectMilestoneTools } from './tools/project-milestones/index.js';
import { projectTools } from './tools/projects/index.js';
import { teamTools } from './tools/teams/index.js';
import { userTools } from './tools/users/index.js';

// Initialize the Linear client with the API key from environment variables
const initializeLinearClient = () => {
  const apiKey = process.env.LINEAR_API_KEY;

  if (!apiKey) {
    process.exit(1);
  }

  try {
    LinearClientManager.getInstance().initialize(apiKey);
    // console.log('Linear client initialized successfully');
  } catch (_error) {
    process.exit(1);
  }
};

// --- Server Setup ---
const server = new McpServer({
  name: 'linear-mcp',
  version: '1.0.0',
  description: 'MCP Server for interacting with Linear issues, projects, teams, and more',
});

// Combine all tools
const allTools = [
  ...issueTools,
  ...projectTools,
  ...teamTools,
  ...userTools,
  ...issueStatusTools,
  ...labelTools,
  // ...myIssuesTools, // Removed duplicate - list_my_issues is already in issueTools
  ...projectMilestoneTools,
];

for (const tool of allTools) {
  server.tool(tool.name, tool.description, tool.inputSchema, tool.handler);
}

// Main function to start the server
export const startServer = async () => {
  try {
    // Initialize the Linear client
    initializeLinearClient();

    // Connect the server to the transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // console.log('Linear MCP server started successfully');
  } catch (_error) {
    // console.error('Failed to start Linear MCP server:', error);
    // process.exit(1);
  }
};

startServer().catch((_error: unknown) => {
  // process.exit(1);
});
