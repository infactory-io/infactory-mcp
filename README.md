# Infactory Quickstart MCP Server

This server provides a comprehensive set of tools to interact with the Infactory API, enabling the entire workflow described in the official Quickstart guide. It allows an AI assistant to manage projects, handle data, build and deploy queries, and use conversational AI features programmatically.

This implementation uses the latest `@modelcontextprotocol/sdk` for robust and modern MCP server development.

## Features

- **Project Management**: Create, list, and delete projects.
- **Data Handling**: Upload CSV files as datasources and monitor their status.
- **AI-Powered Building**: Autogenerate queries from data or create them from natural language.
- **Deployment**: Publish query programs as live, callable REST API endpoints.
- **Execution**: Run queries and call deployed APIs directly.
- **Conversational AI**: Manage and interact with "Explore" chat sessions.

## Setup and Configuration

### 1. Installation

```bash
# Navigate to the server directory
cd infactory-quickstart-mcp-server

# Install dependencies
npm install
```

### 2. Environment Variables

Create a `.env` file in the `infactory-quickstart-mcp-server` directory and add your Infactory API key and base URL:

```NF_API_KEY="YOUR_INFACTORY_API_KEY"
NF_BASE_URL="https://api.infactory.ai"
```

- `NF_API_KEY`: **Required**. Your personal API key for the Infactory platform.
- `NF_BASE_URL`: **Optional**. The base URL for the Infactory API. Defaults to `https://api.infactory.ai`.

### 3. Build the Server

Compile the TypeScript source code into JavaScript:

```bash
npm run build
```

## Running the Server

You can run the server directly or configure it with an MCP client.

### Direct Execution

To start the server and have it listen on standard I/O:

```bash
npm run start
```

### Configuration with an MCP Client (e.g., VS Code, Claude Desktop)

Add the following configuration to your MCP client's settings (e.g., `.vscode/mcp.json` or `claude_desktop_config.json`). Make sure to replace `/path/to/infactory-quickstart-mcp-server` with the actual absolute path to the server's directory on your machine.

```json
{
  "mcp": {
    "servers": {
      "infactory": {
        "command": "node",
        "args": ["/path/to/infactory-mcp/dist/index.js"]
      }
    }
  }
}
```

## Available Tools

The server exposes the following tools, which correspond to the steps in the Quickstart guide:

### User & Project Management

- `get_current_user`: Fetches the current user's profile.
- `create_project`: Creates a new project.
- `list_projects`: Lists available projects.
- `delete_project`: Deletes a specified project.

### Data Management

- `upload_csv`: Uploads a local CSV file as a new datasource.
- `get_datasource_status`: Checks the processing status of a datasource.
- `delete_datasource`: Deletes a datasource.

### Query Building

- `autogenerate_queries`: Creates starter queries based on a project's data.
- `create_query_from_nl`: Generates a query program from a natural language question.
- `list_query_programs`: Lists all query programs in a project.

### Query Execution & Deployment

- `run_query_program`: Executes a query program.
- `publish_query_program`: Deploys a query as a live API endpoint.

### API Management

- `list_apis`: Lists all deployed APIs in a project.
- `list_api_endpoints`: Lists the endpoints for a specific API.
- `call_live_api`: Makes a call to a deployed API endpoint.

### Chat & Explore

- `create_conversation`: Starts a new conversational "Explore" session.
- `send_chat_message`: Sends a message in an existing conversation.
- `get_conversation_graph`: Retrieves the interaction graph of a conversation.

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
