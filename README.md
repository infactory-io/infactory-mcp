# Infactory MCP Server - Quickstart

An MCP (Model Context Protocol) server that enables seamless interaction with the Infactory API. Designed for integration with Claude, VS Code, Cursor, and other MCP-compatible tools, this server supports the full Infactory workflow—from data upload and query generation to deployment and conversational interaction.

This implementation uses the latest `@modelcontextprotocol/sdk` for robust MCP server development.

---

## 🚀 Features

### Project & User Management

- Create, list, and delete projects
- Retrieve current user profile

### Data Handling

- Upload CSVs as datasources
- Check datasource processing status
- Delete datasources

### Query Programs

- Autogenerate queries based on data
- Create query programs from natural language
- List and execute query programs
- Publish query programs as REST APIs

### API Management

- List deployed APIs and their endpoints
- Call live API endpoints

### Conversational AI

- Manage "Explore" chat sessions
- Send chat messages
- Retrieve conversation graphs

---

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+
- An Infactory API key

### Option 1: Clone and Build Locally

```bash
git clone https://github.com/infactory-io/infactory-mcp.git
cd infactory-mcp
npm install
npm run build
````

Start the server:

```bash
npm start
```

Or for debugging:

```bash
npx @modelcontextprotocol/inspector -e "NF_API_KEY=$NF_API_KEY" node -- dist/index.js
```

### Option 2: NPX (Recommended)

```bash
npx -y @infactory/infactory-mcp
```

### Option 3: Docker

```bash
docker run -i --rm \
  -e NF_API_KEY="your_api_key_here" \
  @infactory/infactory-mcp
```

---

## ⚙️ Environment Configuration

Create a `.env` file or define variables in your MCP config:

```bash
NF_API_KEY="YOUR_INFACTORY_API_KEY"      # Required
NF_BASE_URL="https://api.infactory.ai"   # Optional (defaults to official API)
```

---

## 🧠 Example Prompts

You can now interact with Infactory via LLMs like Claude using prompts like:

- "Show me all my Infactory projects"
- "Upload a CSV and generate queries from it"
- "Deploy query program qp-789def as an API"
- "List endpoints for deployed API api-123"
- "Start an Explore chat about revenue metrics"

---

## 🧩 MCP Client Integration

To integrate with Claude Desktop, Cursor, or Windsurf, update your MCP config file (`.mcp.json`, `claude_desktop_config.json`, etc.):

### Local Build

```json
{
  "mcp": {
    "servers": {
      "infactory": {
        "command": "node",
        "args": ["/absolute/path/to/infactory-mcp/dist/index.js"],
        "env": {
          "NF_API_KEY": "nf-************************"
        }
      }
    }
  }
}
```

### NPX Version

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

---

## 📚 Instructional Resources

The server provides built-in guides for AI agents.

- **`quickstart-csv`**

  - **URI**: `infactory://guides/quickstart-csv`
  - **Description**: Markdown guide for uploading CSVs, waiting for processing, generating and running queries, and cleaning up.

---

## 🛠 Available Tools Summary

| Category                   | Tools                                                                   |
| -------------------------- | ----------------------------------------------------------------------- |
| **User/Project**           | `get_current_user`, `create_project`, `list_projects`, `delete_project` |
| **Data**                   | `upload_csv`, `get_datasource_status`, `delete_datasource`              |
| **Query Building**         | `autogenerate_queries`, `create_query_from_nl`, `list_query_programs`   |
| **Execution & Deployment** | `run_query_program`, `publish_query_program`                            |
| **API**                    | `list_apis`, `list_api_endpoints`, `call_live_api`                      |
| **Chat/Explore**           | `create_conversation`, `send_chat_message`, `get_conversation_graph`    |

---

## 📄 License

MIT License
