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

## Usage

### Environment Setup

Set your Linear API key as an environment variable:

```bash
export LINEAR_API_KEY=your_linear_api_key
```

You can get your Linear API key from the [Linear Developer Settings](https://linear.app/settings/api).

### Starting the Server

```javascript
import { startServer } from 'linear-mcp';

startServer();
```

Or use the CLI:

```bash
npx linear-mcp
```

### Connecting to the Server

The server can be connected to using any MCP client. For example, using the MCP CLI:

```bash
npx mcp-cli connect linear
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

### Documentation

- `search_documentation`: Search Linear's documentation to learn about features and usage

### My Issues

- `list_my_issues`: List issues assigned to the current user

## License

ISC