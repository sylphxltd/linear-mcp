# Linear MCP Server

A Model Context Protocol (MCP) server for interacting with Linear issues, projects, teams, and more.

## Features

- List, get, create, and update issues
- List, get, create, and update projects
- List and get teams
- List and get users
- List and get issue statuses
- List issue labels
- Search Linear documentation
- List issues assigned to the current user

## Installation

```bash
npm install linear-mcp
# or
yarn add linear-mcp
# or
pnpm add linear-mcp
```

## MCP Host Configuration

Configure your MCP host (e.g., `mcp_settings.json`) to use npx:

```json
{
  "mcpServers": {
     "linear": {
      "command": "npx",
      "args": [
        "-y",
        "@sylphx/linear-mcp"
      ],
      "env": {
        "LINEAR_API_KEY": ""
      }
    }
  }
}
```
## Available Tools

### Issues

- `list_issues`: List issues in the user's Linear workspace
- `get_issue`: Retrieve a Linear issue details by ID, including attachments
- `create_issue`: Create a new Linear issue
- `update_issue`: Update an existing Linear issue
- `list_comments`: Retrieve comments for a Linear issue by ID
- `create_comment`: Create a comment on a Linear issue by ID
- `get_issue_git_branch_name`: Retrieve the branch name for a Linear issue by ID

### Projects

- `list_projects`: List projects in the user's Linear workspace
- `get_project`: Retrieve details of a specific project in Linear
- `create_project`: Create a new project in Linear
- `update_project`: Update an existing Linear project

### Teams

- `list_teams`: List teams in the user's Linear workspace
- `get_team`: Retrieve details of a specific Linear team

### Users

- `list_users`: Retrieve users in the Linear workspace
- `get_user`: Retrieve details of a specific Linear user

### Issue Statuses

- `list_issue_statuses`: List available issues statuses in a Linear team
- `get_issue_status`: Retrieve details of a specific issue status in Linear by name or ID

### Labels

- `list_issue_labels`: List available issue labels in a Linear team

### My Issues

- `list_my_issues`: List issues assigned to the current user

## License

ISC