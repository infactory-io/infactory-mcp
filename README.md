# Infactory MCP Server

An MCP (Model Context Protocol) server for interacting with Infactory APIs using Claude and other LLMs. This server enables language models to access and manipulate data in your Infactory environment.

## Features

- **Project Management**: List, retrieve, and create projects
- **Query Programs**: List and execute query programs
- **Datasources**: List, retrieve, and create datasources
- **User & Team Management**: Get current user information and list teams

## Getting Started

### Prerequisites

- An Infactory API key
- Node.js 18+ (for local installation)

### Installation

#### Using NPX (Recommended)

```bash
npx -y @infactory/infactory-mcp
```

#### Using Docker

```bash
docker run -i --rm \
  -e NF_API_KEY="your_api_key_here" \
  @infactory/infactory-mcp
```

### Environment Variables

- `NF_API_KEY` (required): Your Infactory API key
- `NF_BASE_URL` (optional): Custom API endpoint if using a different environment

## Available Tools

### Project Tools

- **list_projects**: List all available projects

  - No parameters required

- **get_project**: Get details of a specific project

  - Parameters:
    - `project_id` (string): ID of the project to retrieve

- **create_project**: Create a new project
  - Parameters:
    - `name` (string): Project name
    - `description` (string, optional): Project description
    - `team_id` (string): Team ID

### Query Program Tools

- **list_query_programs**: List query programs in a project

  - Parameters:
    - `project_id` (string): ID of the project

- **execute_query_program**: Execute a query program
  - Parameters:
    - `queryprogram_id` (string): ID of the query program to execute
    - `input_data` (object, optional): Input data for the query program

### Datasource Tools

- **list_datasources**: List datasources in a project

  - Parameters:
    - `project_id` (string): ID of the project

- **get_datasource**: Get details of a specific datasource

  - Parameters:
    - `datasource_id` (string): ID of the datasource

- **create_datasource**: Create a new datasource
  - Parameters:
    - `name` (string): Datasource name
    - `project_id` (string): ID of the project
    - `type` (string): Datasource type

### User and Team Tools

- **get_current_user**: Get information about the current user

  - No parameters required

- **list_teams**: List teams in an organization
  - Parameters:
    - `organization_id` (string): ID of the organization

## Usage with Claude Desktop + Windsurf + Cursor

Here is the likely location of your MCP configuration file:

- Claude Desktop - Add this to your `claude_desktop_config.json`:
- Windsurf - Add this to your `~/.codeium/windsurf/mcp_config.json`:
- Cursor - Add this to your `~/.cursor/mcp.json`:

Add this to your MCP configuration:

```json
{
  "version": "0.1",
  "mcpServers": {
    "infactory-mcp": {
      "command": "npx",
      "args": ["-y", "@infactory/infactory-mcp"],
      "env": {
        "NF_API_KEY": "nf-************************"
      }
    }
  }
}
```

```json
{
  "version": "0.1",
  "mcpServers": {
    "infactory-mcp": {
      "command": "npx",
      "args": ["-y", "@infactory/infactory-mcp@0.6.1"],
      "env": {
        "NF_API_KEY": "nf-2FEUOhBAeMOtzyTqK1VEMFc7D-AMsL89gQOTsDURJn0",
        "NF_BASE_URL": "http://localhost:8000"
      }
    }
  }
}
```

Or if you are doing development:

```json
{
  "version": "0.1",
  "mcpServers": {
    "infactory-mcp": {
      "command": "node",
      "args": ["FULL_PATH_TO/infactory-mcp/dist/index.js"],
      "env": {
        "NF_API_KEY": "nf-************************"
      }
    }
  }
}
```

## Example Prompts

Once your MCP server is configured, you can use prompts like these with Claude:

- "Show me a list of all my Infactory projects"
- "Get the details for project proj-123abc"
- "Create a new project called 'Data Analysis' in team team-456xyz"
- "List all query programs in project proj-123abc"
- "Execute query program qp-789def"
- "Tell me about myself (my user account)"

## Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-server-infactory.git
cd mcp-server-infactory

# Install dependencies
npm install

# Build
npm run build

# Start the server
npm start

# Optional - start inspector (for debugging)
npx @modelcontextprotocol/inspector -e "NF_API_KEY=$NF_API_KEY" node -- dist/index.js
```

## License

MIT License
