# Infactory MCP Desktop Extension (DXT)

A Desktop Extension (DXT) that provides seamless access to Infactory's data analysis and API generation capabilities through Claude Desktop and other MCP clients.

## Overview

Infactory transforms articles, data, and archives into AI-ready formats that can be safely queried, cited and licensed. This DXT extension provides a complete workflow from data upload to API deployment.

## Features

- **Data Management**: Upload CSV files and manage datasources
- **Query Generation**: Auto-generate queries or create custom ones from natural language
- **API Deployment**: Publish query programs as live API endpoints
- **Chat Integration**: Explore data through conversational interfaces
- **Project Management**: Create and manage projects and teams

## Installation

### For Claude Desktop Users

1. [Download the DXT file](https://github.com/infactory-io/infactory-mcp/raw/refs/heads/main/infactory-mcp.dxt)
2. Open Claude Desktop
3. Go to Settings > Extensions
4. Click "Install from file" and select the `.dxt` file
5. Configure your Infactory API key in the extension settings (see Configuration section below)

### For Developers

```bash
# Clone the repository
git clone https://github.com/infactory/infactory-mcp.git
cd infactory-mcp

# Install dependencies
npm install

# Build the extension
npm run build

# Package as DXT
npm run dxt:pack
```

### Installing via NPM

The package is also available on npm as `@infactory/infactory-mcp`:

```bash
# Install globally
npm install -g @infactory/infactory-mcp

# Or use with npx
npx @infactory/infactory-mcp
```

## Configuration

The extension requires configuration through the DXT user interface. After installation, you'll need to configure the following settings:

### Required Settings

- **Infactory API Key**: Your Infactory API key (get this from your [Infactory dashboard](https://app.infactory.ai))
  - This is a sensitive field that will be stored securely
  - Required for all API operations

### Optional Settings

- **Infactory API Base URL**: API base URL (defaults to `https://api.infactory.ai`)
  - Only change this if you're using a custom Infactory instance
  - Optional field with a sensible default

## Connection Samples

<details>
<summary><b>Claude Desktop</b></summary>

Add this to your Claude Desktop `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "infactory-mcp": {
      "command": "npx",
      "args": ["-y", "@infactory/infactory-mcp"],
      "env": {
        "NF_API_KEY": "nf--YOUR_API_KEY_HERE",
        "NF_BASE_URL": "https://api.infactory.ai"
      }
    }
  }
}
```

Note: Replace `nf--YOUR_API_KEY_HERE` with your actual Infactory API key.

</details>

<details>
<summary><b>Cursor</b></summary>

Add this to your Cursor MCP config file (usually at `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "infactory-mcp": {
      "command": "npx",
      "args": ["-y", "@infactory/infactory-mcp"],
      "env": {
        "NF_API_KEY": "nf--YOUR_API_KEY_HERE",
        "NF_BASE_URL": "https://api.infactory.ai"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add this to your Windsurf MCP config file:

```json
{
  "mcpServers": {
    "infactory-mcp": {
      "command": "npx",
      "args": ["-y", "@infactory/infactory-mcp"],
      "env": {
        "NF_API_KEY": "nf--YOUR_API_KEY_HERE",
        "NF_BASE_URL": "https://api.infactory.ai"
      }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code</b></summary>

Add this to your VS Code MCP config file:

```json
{
  "mcp": {
    "servers": {
      "infactory-mcp": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@infactory/infactory-mcp"],
        "env": {
          "NF_API_KEY": "nf--YOUR_API_KEY_HERE",
          "NF_BASE_URL": "https://api.infactory.ai"
        }
      }
    }
  }
}
```

</details>

<details>
<summary><b>Zed</b></summary>

Add this to your Zed `settings.json`:

```json
{
  "context_servers": {
    "infactory-mcp": {
      "command": {
        "path": "npx",
        "args": ["-y", "@infactory/infactory-mcp"],
        "env": {
          "NF_API_KEY": "nf--YOUR_API_KEY_HERE",
          "NF_BASE_URL": "https://api.infactory.ai"
        }
      },
      "settings": {}
    }
  }
}
```

</details>

<details>
<summary><b>Cline</b></summary>

Add this to your Cline MCP settings:

```json
{
  "mcpServers": {
    "infactory-mcp": {
      "command": "npx",
      "args": ["-y", "@infactory/infactory-mcp"],
      "env": {
        "NF_API_KEY": "nf--YOUR_API_KEY_HERE",
        "NF_BASE_URL": "https://api.infactory.ai"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

</details>

<details>
<summary><b>Using Alternative Package Managers</b></summary>

### With Bun

```json
{
  "mcpServers": {
    "infactory-mcp": {
      "command": "bunx",
      "args": ["-y", "@infactory/infactory-mcp"],
      "env": {
        "NF_API_KEY": "nf--YOUR_API_KEY_HERE",
        "NF_BASE_URL": "https://api.infactory.ai"
      }
    }
  }
}
```

### With Deno

```json
{
  "mcpServers": {
    "infactory-mcp": {
      "command": "deno",
      "args": ["run", "--allow-env", "--allow-net", "npm:@infactory/infactory-mcp"],
      "env": {
        "NF_API_KEY": "nf--YOUR_API_KEY_HERE",
        "NF_BASE_URL": "https://api.infactory.ai"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Windows Configuration</b></summary>

For Windows users, the configuration is slightly different:

```json
{
  "mcpServers": {
    "infactory-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@infactory/infactory-mcp"],
      "env": {
        "NF_API_KEY": "nf--YOUR_API_KEY_HERE",
        "NF_BASE_URL": "https://api.infactory.ai"
      }
    }
  }
}
```

</details>

## Usage

### Quick Start Workflow

1. **Get Your Team ID**
   ```
   get_current_user
   ```

2. **Create a Project**
   ```
   create_project {"name": "My Analysis Project", "teamId": "team-..."}
   ```

3. **Upload CSV Data**
   ```
   upload_csv {"projectId": "proj-...", "filePath": "/path/to/data.csv", "datasourceName": "My Data"}
   ```

4. **Check Processing Status**
   ```
   get_datasource_status {"datasourceId": "ds-..."}
   ```

5. **Generate Queries**
   ```
   autogenerate_queries {"projectId": "proj-...", "count": 3}
   ```

6. **Run a Query**
   ```
   run_query_program {"projectId": "proj-...", "queryProgramId": "qp-..."}
   ```

7. **Create Custom Query**
   ```
   create_query_from_nl {"projectId": "proj-...", "question": "What is the average value by category?"}
   ```

8. **Publish as API**
   ```
   publish_query_program {"queryProgramId": "qp-..."}
   ```

### Available Tools

#### User & Project Management
- `get_current_user` - Get user profile and team information
- `create_project` - Create a new project
- `list_projects` - List all projects in a team
- `delete_project` - Delete a project

#### Data Management
- `upload_csv` - Upload a CSV file to create a datasource
- `get_datasource_status` - Check datasource processing status
- `delete_datasource` - Delete a datasource

#### Query Building
- `autogenerate_queries` - Generate starter queries based on data
- `create_query_from_nl` - Create query from natural language
- `list_query_programs` - List all query programs in a project

#### Query Execution
- `run_query_program` - Execute a query program
- `publish_query_program` - Publish query as live API

#### API Management
- `list_apis` - List deployed APIs
- `list_api_endpoints` - List API endpoints
- `call_live_api` - Call a live API endpoint

#### Chat & Explore
- `create_conversation` - Start a chat session
- `send_chat_message` - Send a message in chat
- `get_conversation_graph` - Get conversation interaction graph

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript

### Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Validate DXT manifest
npm run dxt:validate
```

### Testing with MCP Inspector

```bash
# Run the MCP inspector to test tools
npm run inspector

# Or use npx directly
npx @modelcontextprotocol/inspector npx @infactory/infactory-mcp
```

### Building for Distribution

```bash
# Build and package as DXT
npm run dxt:pack
```

This creates a `.dxt` file that can be distributed and installed in Claude Desktop.

## Error Handling

The extension includes comprehensive error handling:

- **Timeout Management**: All API calls have appropriate timeouts
- **Configuration Validation**: Ensures required settings are present
- **Graceful Degradation**: Handles network and API errors gracefully
- **Detailed Logging**: Provides clear error messages for debugging

## Security

- API keys are stored securely using the host's secure storage
- Sensitive configuration fields are marked appropriately
- All API calls use HTTPS with proper authentication

## Troubleshooting

### Common Issues

1. **"NF_API_KEY not set"**
   - Ensure you've configured the "Infactory API Key" in the extension settings
   - Verify the key is valid in your Infactory dashboard
   - Check that the configuration was saved properly

2. **"Could not get default team ID"**
   - Check your API key permissions
   - Ensure you have access to at least one team

3. **File upload failures**
   - Verify the file path exists and is accessible
   - Check file size limits (typically 100MB)
   - Ensure the file is a valid CSV

4. **Query execution timeouts**
   - Large datasets may take longer to process
   - Consider breaking data into smaller chunks
   - Check your Infactory plan limits

5. **Module resolution issues**
   - Try using `bunx` instead of `npx` if you encounter module errors
   - Ensure Node.js v18 or higher is installed
   - Use `@infactory/infactory-mcp@latest` to get the latest version

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=* npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: [https://docs.infactory.ai](https://docs.infactory.ai)
- **Issues**: [GitHub Issues](https://github.com/infactory/infactory-mcp/issues)
- **Email**: [sean@infactory.ai](mailto:sean@infactory.ai)

## Changelog

### v0.8.0
- Initial DXT release
- Complete MCP server implementation
- All core Infactory functionality
- Comprehensive error handling and timeouts
- DXT packaging and validation
