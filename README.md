# Infactory MCP Server

An MCP server using https://api.infactory.ai to connect to and build applications with your data.

## Features

- **Connect**: Connect files, databases and APIs to an Infactory Project
- **Build**: Build queries to access and transform your data to answer specific questions
- **Deploy**: Deploy your queries as APIs to build applications with your data
- **Explore**: An organic chat interface to explore your deployed queries

## Tools

- **retrieve_from_infactory_kb**
  - Perform retrieval operations using the Infactory Knowledge Base.
  - Inputs:
    - `query` (string): The search query for retrieval.
    - `knowledgeBaseId` (string): The ID of the Infactory Knowledge Base.
    - `n` (number, optional): Number of results to retrieve (default: 3).

## Configuration

### Setting up Infactory Credentials

1. Obtain API key from the [Infactory Workshop](https://workshop.infactory.ai) then click [API Keys](https://workshop.infactory.ai/api-keys) to generate a new key.
2. Copy the API key and save it in a secure location.


### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "infactory-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@infactory/infactory-mcp"
      ],
      "env": {
        "NF_API_KEY": "YOUR_INFACTORY_API_KEY"
      }
    }
  }
}
```

## Building and Development usage

### Docker

```sh
git clone https://github.com/infactory/infactory-mcp.git
cd infactory-mcp
docker build -t infactory-mcp -f src/Dockerfile . 
```

### Docker configuration
After building the docker image, follow the instructions in the [Usage](#usage-with-claude-desktop) section above but replace `commands` and `args` like below

```json
{
  "mcpServers": {
    "infactory-mcp": {
      "command": "docker",
      "args": [ "run", "-i", "--rm", "-e", "NF_API_KEY", "infactory-mcp" ],
      "env": {
        "NF_API_KEY": "YOUR_INFACTORY_API_KEY"
      }
    }
  }
}
```

## License

This Infactory MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
