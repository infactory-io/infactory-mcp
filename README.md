# Infactory MCP Server

An MCP server using https://api.infactory.ai to connect to and build applications with your data.

## Features

- **Connect**: Connect files, databases and APIs to an Infactory Project
- **Build**: Build queries to access and transform your data to answer specific questions
- **Deploy**: Deploy your queries as APIs to build applications with your data
- **Explore**: An organic chat interface to explore your deployed queries

## Tools

- **list_projects**
  - Lists all projects in your Infactory account
- **select_project**
  - Select a project to work on based on either the provided name or projectId
  - Inputs:
    - `projectId` (string): The ID of the Infactory Project.
    - `projectName` (string): The name of the Infactory Project.

## Configuration

### Setting up Infactory Credentials

1. Obtain API key from the [Infactory Workshop](https://workshop.infactory.ai) then click [API Keys](https://workshop.infactory.ai/api-keys) to generate a new key.
2. Copy the API key and save it in a secure location.


## Usage

### Claude Desktop

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

## Development

### Testing locally

Standalone

```sh
export NF_API_KEY=nf-************************
node dist/index.js
```

Use Inspector

```sh
npm run build
export NF_API_KEY=nf-************************
npx @modelcontextprotocol/inspector -e "NF_API_KEY=$NF_API_KEY" node -- dist/index.js 
```

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

## Deployment

This repo is built and deployed to NPM via GitHub Actions.  It is available at https://www.npmjs.com/package/@infactory/infactory-mcp

We use the `NPM_TOKEN` github secret to authenticate the publish process and this token will be managed by the Infactory development team.

We use semantic versioning for releases. For example v1.0.0


## License

This Infactory MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

