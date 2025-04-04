// index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InfactoryClient, ApiResponse } from '@infactory/infactory-ts';
import { z } from 'zod';

// Initialize Infactory client
function getClient(): InfactoryClient {
  const apiKey = process.env.NF_API_KEY;
  if (!apiKey) {
    throw new Error('NF_API_KEY environment variable is required');
  }
  
  const baseURL = process.env.NF_BASE_URL;
  
  return new InfactoryClient({
    apiKey,
    baseURL
  });
}

// Format API responses consistently
function formatResponse<T>(response: ApiResponse<T>): string {
  if (response.error) {
    return `Error: ${response.error.message || JSON.stringify(response.error)}`;
  }
  return JSON.stringify(response.data, null, 2);
}

// Create server instance
const server = new McpServer({
  name: 'infactory-mcp',
  version: '0.0.2'
});

// Project tools
server.tool(
  'list_projects',
  {},
  async (_args, _extra) => {
    const client = getClient();
    const response = await client.projects.getProjects();
    return { content: [{ type: 'text', text: formatResponse(response) }] };
  }
);

server.tool(
  'get_project',
  { project_id: z.string().describe('Project ID') },
  async ({ project_id }) => {
    const client = getClient();
    const response = await client.projects.getProject(project_id);
    return { content: [{ type: 'text', text: formatResponse(response) }] };
  }
);

server.tool(
  'create_project',
  {
    name: z.string().describe('Project name'),
    description: z.string().optional().describe('Project description'),
    team_id: z.string().describe('Team ID')
  },
  async ({ name, description, team_id }) => {
    const client = getClient();
    const response = await client.projects.createProject({
      name,
      description,
      team_id
    });
    return { content: [{ type: 'text', text: formatResponse(response) }] };
  }
);

// Query program tools
server.tool(
  'list_query_programs',
  { project_id: z.string().describe('Project ID') },
  async ({ project_id }) => {
    const client = getClient();
    const response = await client.queryprograms.getQueryProgramsByProject(project_id);
    return { content: [{ type: 'text', text: formatResponse(response) }] };
  }
);

server.tool(
  'execute_query_program',
  {
    queryprogram_id: z.string().describe('Query Program ID'),
    input_data: z.record(z.any()).optional().describe('Optional input data for the query program')
  },
  async ({ queryprogram_id, input_data }) => {
    const client = getClient();
    const response = await client.queryprograms.executeQueryProgram(
      queryprogram_id, 
      { input_data, stream: false }
    );
    return { content: [{ type: 'text', text: formatResponse(response as ApiResponse<any>) }] };
  }
);

// Datasource tools
server.tool(
  'list_datasources',
  { project_id: z.string().describe('Project ID') },
  async ({ project_id }) => {
    const client = getClient();
    const response = await client.datasources.getProjectDatasources(project_id);
    return { content: [{ type: 'text', text: formatResponse(response) }] };
  }
);

server.tool(
  'get_datasource',
  {
    datasource_id: z.string().describe('Datasource ID')
  },
  async ({ datasource_id }) => {
    const client = getClient();
    const response = await client.datasources.getDatasource(datasource_id);
    return { content: [{ type: 'text', text: formatResponse(response) }] };
  }
);

server.tool(
  'create_datasource',
  {
    name: z.string().describe('Name of the datasource'),
    project_id: z.string().describe('Project ID'),
    type: z.string().describe('Type of datasource')
  },
  async ({ name, project_id, type }) => {
    const client = getClient();
    const response = await client.datasources.createDatasource({
      name,
      project_id,
      type
    });
    return { content: [{ type: 'text', text: formatResponse(response) }] };
  }
);

// User and team tools
server.tool(
  'get_current_user',
  {},
  async (_args, _extra) => {
    const client = getClient();
    const response = await client.users.getCurrentUser();
    return { content: [{ type: 'text', text: formatResponse(response) }] };
  }
);

server.tool(
  'list_teams',
  { organization_id: z.string().describe('Organization ID') },
  async ({ organization_id }) => {
    const client = getClient();
    const response = await client.teams.getTeams(organization_id);
    return { content: [{ type: 'text', text: formatResponse(response) }] };
  }
);

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    process.exit(0);
  });
  
  try {
    // Start receiving messages on stdin and sending messages on stdout
    await server.connect(transport);
  } catch (error) {
    console.error('Server error:', error);
    process.exit(1);
  }
}

runServer();
