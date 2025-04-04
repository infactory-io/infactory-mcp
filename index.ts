// import { Server, StdioServerTransport } from '@modelcontextprotocol/sdk';
import { McpServer as Server } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InfactoryClient, ApiResponse } from '@infactory/infactory-ts';
import { z } from 'zod';

// Input validation schemas
const ProjectToolSchema = z.object({
  project_id: z.string().describe('Project ID')
});

const CreateProjectSchema = z.object({
  name: z.string().describe('Project name'),
  description: z.string().optional().describe('Project description'),
  team_id: z.string().describe('Team ID')
});

const QueryProgramSchema = z.object({
  project_id: z.string().describe('Project ID'),
  queryprogram_id: z.string().optional().describe('Query Program ID')
});

const ExecuteQueryProgramSchema = z.object({
  queryprogram_id: z.string().describe('Query Program ID'),
  input_data: z.record(z.any()).optional().describe('Optional input data for the query program')
});

const DatasourceSchema = z.object({
  project_id: z.string().describe('Project ID'),
  datasource_id: z.string().optional().describe('Datasource ID')
});

const CreateDatasourceSchema = z.object({
  name: z.string().describe('Name of the datasource'),
  project_id: z.string().describe('Project ID'),
  type: z.string().describe('Type of datasource')
});

const TeamSchema = z.object({
  organization_id: z.string().describe('Organization ID')
});

// Initialize Infactory client
function getClient(): InfactoryClient {
  const apiKey = process.env.INFACTORY_API_KEY;
  if (!apiKey) {
    throw new Error('INFACTORY_API_KEY environment variable is required');
  }
  
  const baseURL = process.env.INFACTORY_BASE_URL;
  
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

// Define MCP server with tools
const server = new Server({
  name: 'infactory-mcp',
  version: '0.0.2',
  tools: [
      // Project tools
      {
        name: 'list_projects',
        description: 'List all available projects',
        inputSchema: {}
      },
      {
        name: 'get_project',
        description: 'Get details of a specific project',
        inputSchema: ProjectToolSchema.shape
      },
      {
        name: 'create_project',
        description: 'Create a new project',
        inputSchema: CreateProjectSchema.shape
      },
      
      // Query program tools
      {
        name: 'list_query_programs',
        description: 'List query programs in a project',
        inputSchema: ProjectToolSchema.shape
      },
      {
        name: 'execute_query_program',
        description: 'Execute a query program',
        inputSchema: ExecuteQueryProgramSchema.shape
      },
      
      // Datasource tools
      {
        name: 'list_datasources',
        description: 'List datasources in a project',
        inputSchema: ProjectToolSchema.shape
      },
      {
        name: 'get_datasource',
        description: 'Get details of a specific datasource',
        inputSchema: DatasourceSchema.shape
      },
      {
        name: 'create_datasource',
        description: 'Create a new datasource',
        inputSchema: CreateDatasourceSchema.shape
      },
      
      // User and team tools
      {
        name: 'get_current_user',
        description: 'Get current user information',
        inputSchema: {}
      },
      {
        name: 'list_teams',
        description: 'List teams in an organization',
        inputSchema: TeamSchema.shape
      }
  ],
  handler: async (request: any) => {
    try {
      const client = getClient();
      const { name, arguments: args } = request.params;
      
      switch (name) {
        // Project operations
        case 'list_projects': {
          const response = await client.projects.getProjects();
          return { content: [{ type: 'text', text: formatResponse(response) }] };
        }
        
        case 'get_project': {
          if (!args?.project_id) {
            throw new Error('project_id is required');
          }
          const response = await client.projects.getProject(args.project_id);
          return { content: [{ type: 'text', text: formatResponse(response) }] };
        }
        
        case 'create_project': {
          if (!args?.name || !args?.team_id) {
            throw new Error('name and team_id are required');
          }
          const response = await client.projects.createProject({
            name: args.name,
            description: args.description,
            team_id: args.team_id
          });
          return { content: [{ type: 'text', text: formatResponse(response) }] };
        }
        
        // Query program operations
        case 'list_query_programs': {
          if (!args?.project_id) {
            throw new Error('project_id is required');
          }
          const response = await client.queryprograms.getQueryProgramsByProject(args.project_id);
          return { content: [{ type: 'text', text: formatResponse(response) }] };
        }
        
        case 'execute_query_program': {
          if (!args?.queryprogram_id) {
            throw new Error('queryprogram_id is required');
          }
          
          // Execute with streaming disabled to ensure we get an ApiResponse object
          const response = await client.queryprograms.executeQueryProgram(
            args.queryprogram_id, 
            { input_data: args.input_data, stream: false }
          );
          
          // Since we explicitly set stream: false, we know this is an ApiResponse
          return { content: [{ type: 'text', text: formatResponse(response as ApiResponse<any>) }] };
        }
        
        // Datasource operations
        case 'list_datasources': {
          if (!args?.project_id) {
            throw new Error('project_id is required');
          }
          const response = await client.datasources.getProjectDatasources(args.project_id);
          return { content: [{ type: 'text', text: formatResponse(response) }] };
        }
        
        case 'get_datasource': {
          if (!args?.datasource_id) {
            throw new Error('datasource_id is required');
          }
          const response = await client.datasources.getDatasource(args.datasource_id);
          return { content: [{ type: 'text', text: formatResponse(response) }] };
        }
        
        case 'create_datasource': {
          if (!args?.name || !args?.project_id || !args?.type) {
            throw new Error('name, project_id, and type are required');
          }
          const response = await client.datasources.createDatasource({
            name: args.name,
            project_id: args.project_id,
            type: args.type
          });
          return { content: [{ type: 'text', text: formatResponse(response) }] };
        }
        
        // User and team operations
        case 'get_current_user': {
          const response = await client.users.getCurrentUser();
          return { content: [{ type: 'text', text: formatResponse(response) }] };
        }
        
        case 'list_teams': {
          if (!args?.organization_id) {
            throw new Error('organization_id is required');
          }
          const response = await client.teams.getTeams(args.organization_id);
          return { content: [{ type: 'text', text: formatResponse(response) }] };
        }
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error('Error handling request:', error);
      return {
        content: [{ 
          type: 'text', 
          text: `Error: ${error instanceof Error ? error.message : String(error)}` 
        }],
        isError: true
      };
    }
  },
});

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
