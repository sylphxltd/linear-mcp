# Linear MCP Server

A Model Context Protocol (MCP) server for interacting with Linear issues, projects, teams, project milestones and more.

## Features

- List, get, create, and update issues
- List, get, create, and update projects
- List and get teams
- List and get users
- List and get issue statuses
- List issue labels
- Manage project milestones (list, create, update, delete)
- List issues assigned to the current user

## Installation

```bash
npm install linear-mcp
# or
yarn add linear-mcp
# or
pnpm add linear-mcp
```
## Code Style & Formatting

This project enforces a consistent code style and formatting using [Biome](https://biomejs.dev/). All code and configuration files are automatically checked and formatted according to the shared [`@sylphlab/biome-config`](https://github.com/sylphxltd/biome-config) rules, as specified in [`biome.json`](./biome.json).

**How to check and fix formatting:**
```bash
pnpm exec biome check .      # Check for formatting/lint issues
pnpm exec biome check --apply-unsafe .   # Auto-fix all issues
```

All commits must pass Biome checks with zero errors. For details on the enforced style, see the shared config linked above.

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

- `list_issues`: List issues in the user's Linear workspace. Supports filtering by `projectMilestoneId`.
    - **Key Inputs:** `query` (optional string), `teamId` (optional string), `stateId` (optional string), `assigneeId` (optional string), `projectMilestoneId` (optional string), `includeArchived` (boolean, default: true), `limit` (number, default: 50).
    - **Output:** Returns a list of issue objects with detailed information including `state`, `assignee`, and `projectMilestone` (if associated).
- `get_issue`: Retrieve a Linear issue's details by ID, including attachments and `projectMilestone` information.
    - **Key Inputs:** `id` (string).
    - **Output:** Returns a single issue object with its relations, including detailed `projectMilestone` information if associated.
- `create_issue`: Create a new Linear issue. Can optionally associate with a `projectMilestoneId`.
    - **Key Inputs:** `title` (string), `teamId` (string), `description` (optional string), `priority` (optional number), `projectId` (optional string), `stateId` (optional string), `assigneeId` (optional string), `labelIds` (optional array of strings), `dueDate` (optional string), `projectMilestoneId` (optional string).
    - **Output:** Returns a simplified issue object for the created issue, including `projectMilestone` information if associated.
- `update_issue`: Update an existing Linear issue. Can associate/disassociate with a `projectMilestoneId` (string or null).
    - **Key Inputs:** `id` (string), `title` (optional string), `description` (optional string), `priority` (optional number), `projectId` (optional string), `stateId` (optional string), `assigneeId` (optional string), `labelIds` (optional array of strings), `dueDate` (optional string), `projectMilestoneId` (optional string or null).
    - **Output:** Returns a simplified issue object for the updated issue, including `projectMilestone` information if associated.
- `list_comments`: Retrieve comments for a Linear issue by ID.
- `create_comment`: Create a comment on a Linear issue by ID.
- `get_issue_git_branch_name`: Retrieve the branch name for a Linear issue by ID.

### Projects

- `list_projects`: List projects in the user's Linear workspace.
- `get_project`: Retrieve details of a specific project in Linear.
- `create_project`: Create a new project in Linear.
- `update_project`: Update an existing Linear project.

### Project Milestones
- `list_project_milestones`: List all project milestones for a given project.
    - **Key Inputs:** `projectId` (string).
    - **Output:** Returns a list of project milestone objects.
- `create_project_milestone`: Create a new project milestone.
    - **Key Inputs:** `projectId` (string), `name` (string), `description` (optional string), `targetDate` (optional ISO date string).
    - **Output:** Returns the created project milestone object.
- `update_project_milestone`: Update an existing project milestone.
    - **Key Inputs:** `milestoneId` (string), `name` (optional string), `description` (optional string), `targetDate` (optional ISO date string).
    - **Output:** Returns the updated project milestone object.
- `delete_project_milestone`: Delete a project milestone.
    - **Key Inputs:** `milestoneId` (string).
    - **Output:** Returns a confirmation of deletion.

### Teams

- `list_teams`: List teams in the user's Linear workspace.
- `get_team`: Retrieve details of a specific Linear team.

### Users

- `list_users`: Retrieve users in the Linear workspace.
- `get_user`: Retrieve details of a specific Linear user.

### Issue Statuses

- `list_issue_statuses`: List available issues statuses in a Linear team.
- `get_issue_status`: Retrieve details of a specific issue status in Linear by name or ID.

### Labels

- `list_issue_labels`: List available issue labels in a Linear team.

### My Issues

- `list_my_issues`: List issues assigned to the current user.

## License

ISC
## Issues Module Structure (Refactored for Modularity)

- [`schemas.ts`](src/tools/issues/schemas.ts): Zod schemas for validation.
- [`types.ts`](src/tools/issues/types.ts): TypeScript types and interfaces.
- [`mappers.ts`](src/tools/issues/mappers.ts): Mapping/business logic functions.
- Operation files (e.g., [`create_issue.ts`](src/tools/issues/create_issue.ts), [`update_issue.ts`](src/tools/issues/update_issue.ts)) import only what they need from these modules.

This structure ensures clear separation of concerns, minimal dependencies, and improved maintainability.