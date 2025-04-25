#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  InfactoryClient,
  ApiResponse,
  isReadableStream,
  processStreamToApiResponse,
} from "@infactory/infactory-ts";
import { z } from "zod";

// Initialize Infactory client
function getClient(): InfactoryClient {
  const apiKey = process.env.NF_API_KEY;
  if (!apiKey) {
    throw new Error("NF_API_KEY environment variable is required");
  }

  const baseURL = process.env.NF_BASE_URL;

  return new InfactoryClient({
    apiKey,
    baseURL,
  });
}
``;

// Format API responses consistently, handles streams, now async
async function formatResponse<T>(
  response: ApiResponse<T> | ReadableStream<Uint8Array>,
): Promise<string> {
  // Handle streaming responses
  if (isReadableStream(response)) {
    console.info("Received stream, processing..."); // Added logging
    try {
      const processedResponse = await processStreamToApiResponse<T>(response);
      if (processedResponse.error) {
        console.error("Stream processing error:", processedResponse.error);
        // Provide more detail from the specific error type if available
        const message =
          processedResponse.error.message ||
          JSON.stringify(processedResponse.error);
        const details = processedResponse.error.details
          ? ` Details: ${JSON.stringify(processedResponse.error.details)}`
          : "";
        return `Error: ${message}${details}`;
      }
      console.info("Stream processed successfully.");
      return JSON.stringify(processedResponse.data ?? null, null, 2); // Handle potentially undefined data
    } catch (streamError) {
      console.error("Exception during stream processing:", streamError);
      return `Error processing stream: ${streamError instanceof Error ? streamError.message : String(streamError)}`;
    }
  }
  // Handle regular non-streaming responses
  if (response.error) {
    console.error("API Error:", response.error);
    const message = response.error.message || JSON.stringify(response.error);
    const details = response.error.details
      ? ` Details: ${JSON.stringify(response.error.details)}`
      : "";
    return `Error: ${message}${details}`;
  }
  return JSON.stringify(response.data ?? null, null, 2); // Handle potentially undefined data
}

// Create server instance
const server = new McpServer({
  name: "infactory-mcp",
  version: "0.1.7", // Incremented version
});

// Project tools
server.tool(
  "list_projects",
  { _empty: z.object({}).optional() },
  async (_args, _extra) => {
    const client = getClient();
    const response = await client.projects.getProjects();
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_project",
  { project_id: z.string().describe("Project ID") },
  async ({ project_id }) => {
    const client = getClient();
    const response = await client.projects.getProject(project_id);
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "create_project",
  {
    name: z.string().describe("Project name"),
    description: z.string().optional().describe("Project description"),
    team_id: z.string().describe("Team ID"),
  },
  async ({ name, description, team_id }) => {
    const client = getClient();
    const response = await client.projects.createProject({
      name,
      description,
      teamId: team_id, // SDK expects camelCase teamId
    });
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "update_project",
  {
    project_id: z.string().describe("ID of the project to update"),
    name: z.string().optional().describe("New project name"),
    description: z.string().optional().describe("New project description"),
    team_id: z
      .string()
      .describe("The Team ID the project belongs to (required for update)"),
  },
  async ({ project_id, name, description, team_id }) => {
    const client = getClient();
    const response = await client.projects.updateProject(project_id, {
      name,
      description,
      teamId: team_id, // SDK expects camelCase
    });
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "delete_project",
  {
    project_id: z.string().describe("ID of the project to delete"),
    permanent: z
      .boolean()
      .optional()
      .default(false)
      .describe("Set to true to permanently delete"),
  },
  async ({ project_id, permanent }) => {
    const client = getClient();
    const response = await client.projects.deleteProject(project_id, permanent);
    // Delete often returns no body on success, formatResponse handles null data
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

// Query program tools
server.tool(
  "list_query_programs",
  { project_id: z.string().describe("Project ID") },
  async ({ project_id }) => {
    const client = getClient();
    // Use listQueryPrograms with projectId in options object
    const response = await client.queryPrograms.listQueryPrograms({
      projectId: project_id,
    });
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "execute_query_program",
  {
    queryprogram_id: z.string().describe("Query Program ID"),
    input_data: z
      .record(z.any())
      .optional()
      .describe("Optional input data for the query program"),
    // Optional: Add a stream parameter if you want the *user* to control streaming
    // stream: z.boolean().optional().default(false).describe("Set to true to receive a streaming response")
  },
  // async ({ queryprogram_id, input_data, stream }) => { // If adding stream control
  async ({ queryprogram_id, input_data }) => {
    const client = getClient();
    // Pass input_data directly as second argument
    // Add stream param if implementing user control: , { ...input_data, stream }
    const response = await client.queryPrograms.executeQueryProgram(
      queryprogram_id,
      input_data, // Pass input_data directly as parameters
    );
    // Await formatResponse (now handles potential stream)
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_query_program",
  { queryprogram_id: z.string().describe("ID of the query program") },
  async ({ queryprogram_id }) => {
    const client = getClient();
    const response =
      await client.queryPrograms.getQueryProgram(queryprogram_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "create_query_program",
  {
    project_id: z.string().describe("Project ID to create the program in"),
    name: z.string().optional().describe("Name for the query program"),
    query: z
      .string()
      .optional()
      .describe("Natural language query or definition"),
    // Add other optional fields from CreateQueryProgramParams if needed (queryProgram, steps, slots, stores, published)
  },
  async (params) => {
    const client = getClient();
    const response = await client.queryPrograms.createQueryProgram({
      projectId: params.project_id,
      name: params.name,
      query: params.query,
      // Map other params if added to the schema
    });
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "update_query_program",
  {
    queryprogram_id: z.string().describe("ID of the query program to update"),
    name: z.string().optional().describe("New name for the query program"),
    query: z.string().optional().describe("Updated query definition"),
    published: z.boolean().optional().describe("New published status"),
    // Add other optional fields from CreateQueryProgramParams if needed
  },
  async (params) => {
    const client = getClient();
    const { queryprogram_id, ...updateData } = params; // Separate ID from update payload
    const response = await client.queryPrograms.updateQueryProgram(
      queryprogram_id,
      updateData, // Pass remaining fields as update payload
    );
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "delete_query_program",
  {
    queryprogram_id: z.string().describe("ID of the query program to delete"),
    permanent: z
      .boolean()
      .optional()
      .default(false)
      .describe("Set to true to permanently delete"),
  },
  async ({ queryprogram_id, permanent }) => {
    const client = getClient();
    const response = await client.queryPrograms.deleteQueryProgram(
      queryprogram_id,
      permanent,
    );
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "publish_query_program",
  {
    queryprogram_id: z.string().describe("ID of the query program to publish"),
  },
  async ({ queryprogram_id }) => {
    const client = getClient();
    const response =
      await client.queryPrograms.publishQueryProgram(queryprogram_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "unpublish_query_program",
  {
    queryprogram_id: z
      .string()
      .describe("ID of the query program to unpublish"),
  },
  async ({ queryprogram_id }) => {
    const client = getClient();
    const response =
      await client.queryPrograms.unpublishQueryProgram(queryprogram_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_query_program_history",
  {
    queryprogram_id: z.string().describe("ID of the query program"),
    limit: z
      .number()
      .optional()
      .describe("Max number of history entries to return"),
    // Add other pagination/filter params from SDK if needed (page, start_date, end_date)
  },
  async ({ queryprogram_id, limit }) => {
    const client = getClient();
    const response = await client.queryPrograms.getQueryProgramHistory(
      queryprogram_id,
      { limit },
    );
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "validate_query_program",
  {
    project_id: z.string().describe("Project ID context for validation"),
    name: z.string().optional().describe("Name for the query program"),
    query: z
      .string()
      .optional()
      .describe("Natural language query or definition"),
    // Add other optional fields from CreateQueryProgramParams if needed
  },
  async (params) => {
    const client = getClient();
    const response = await client.queryPrograms.validateQueryProgram({
      projectId: params.project_id,
      name: params.name,
      query: params.query,
      // Map other params if added
    });
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_project_coverage",
  { project_id: z.string().describe("Project ID to get coverage for") },
  async ({ project_id }) => {
    const client = getClient();
    const response = await client.queryPrograms.getCoverage(project_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

// Datasource tools
server.tool(
  "list_datasources",
  { project_id: z.string().describe("Project ID") },
  async ({ project_id }) => {
    const client = getClient();
    const response = await client.datasources.getProjectDatasources(project_id);
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_datasource",
  {
    datasource_id: z.string().describe("Datasource ID"),
  },
  async ({ datasource_id }) => {
    const client = getClient();
    const response = await client.datasources.getDatasource(datasource_id);
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "create_datasource",
  {
    name: z.string().describe("Name of the datasource"),
    project_id: z.string().describe("Project ID"),
    type: z.string().describe("Type of datasource"),
  },
  async ({ name, project_id, type }) => {
    const client = getClient();
    const response = await client.datasources.createDatasource({
      name,
      projectId: project_id, // SDK expects camelCase projectId
      type,
    });
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "update_datasource",
  {
    datasource_id: z.string().describe("ID of the datasource to update"),
    name: z.string().optional().describe("New name for the datasource"),
    type: z.string().optional().describe("New type for the datasource"),
    uri: z.string().optional().describe("New URI for the datasource"),
  },
  async (params) => {
    const client = getClient();
    const { datasource_id, ...updateData } = params;
    const response = await client.datasources.updateDatasource(
      datasource_id,
      updateData,
    );
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "delete_datasource",
  {
    datasource_id: z.string().describe("ID of the datasource to delete"),
    permanent: z
      .boolean()
      .optional()
      .default(false)
      .describe("Set to true to permanently delete"),
  },
  async ({ datasource_id, permanent }) => {
    const client = getClient();
    const response = await client.datasources.deleteDatasource(
      datasource_id,
      permanent,
    );
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_datasource_with_datalines",
  { datasource_id: z.string().describe("ID of the datasource") },
  async ({ datasource_id }) => {
    const client = getClient();
    const response =
      await client.datasources.getDatasourceWithDatalines(datasource_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_datasource_ontology_graph",
  { datasource_id: z.string().describe("ID of the datasource") },
  async ({ datasource_id }) => {
    const client = getClient();
    const response = await client.datasources.getOntologyGraph(datasource_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

// User and team tools
server.tool(
  "get_current_user",
  { _empty: z.object({}).optional() },
  async (_args, _extra) => {
    const client = getClient();
    const response = await client.users.getCurrentUser();
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "list_users",
  {
    organization_id: z
      .string()
      .optional()
      .describe("Optional: Filter users by Organization ID"),
  },
  async ({ organization_id }) => {
    const client = getClient();
    const response = await client.users.getUsers(organization_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_user",
  { user_id: z.string().describe("ID of the user to retrieve") },
  async ({ user_id }) => {
    const client = getClient();
    const response = await client.users.getUser(user_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_user_roles",
  { user_id: z.string().describe("ID of the user") },
  async ({ user_id }) => {
    const client = getClient();
    const response = await client.users.getUserRoles(user_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

// Provides richer context than just listing teams
server.tool(
  "get_user_context", // Renamed for clarity
  {
    user_id: z
      .string()
      .optional()
      .describe("User ID (optional if getting current user's context)"),
    email: z
      .string()
      .optional()
      .describe("User email (alternative identifier)"),
    clerk_user_id: z
      .string()
      .optional()
      .describe("Clerk User ID (alternative identifier)"),
  },
  async ({ user_id, email, clerk_user_id }) => {
    const client = getClient();
    // Prioritize identifiers if multiple are given
    const params = user_id
      ? { userId: user_id }
      : email
        ? { email: email }
        : clerk_user_id
          ? { clerkUserId: clerk_user_id }
          : {}; // If none given, relies on API using authenticated user

    if (Object.keys(params).length === 0) {
      // If no identifier is provided, try getting context for the current user
      const currentUser = await client.users.getCurrentUser();
      if (currentUser.error || !currentUser.data?.id) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting current user to determine context: ${await formatResponse(currentUser)}`,
            },
          ],
        };
      }
      params.userId = currentUser.data.id;
    }

    const response =
      await client.users.getTeamsWithOrganizationsAndProjects(params);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "list_teams",
  { organization_id: z.string().describe("Organization ID") },
  async ({ organization_id }) => {
    const client = getClient();
    // Pass organization_id directly
    const response = await client.teams.getTeams(organization_id);
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "create_team",
  {
    name: z.string().describe("Name for the new team"),
    organization_id: z.string().describe("Organization ID the team belongs to"),
  },
  async ({ name, organization_id }) => {
    const client = getClient();
    const response = await client.teams.createTeam({
      name,
      organizationId: organization_id,
    });
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "update_team",
  {
    team_id: z.string().describe("ID of the team to update"),
    name: z.string().describe("New name for the team"),
  },
  async ({ team_id, name }) => {
    const client = getClient();
    const response = await client.teams.updateTeam(team_id, { name });
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "delete_team",
  { team_id: z.string().describe("ID of the team to delete") },
  async ({ team_id }) => {
    const client = getClient();
    const response = await client.teams.deleteTeam(team_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "list_team_members",
  { team_id: z.string().describe("ID of the team") },
  async ({ team_id }) => {
    const client = getClient();
    const response = await client.teams.getTeamMemberships(team_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

// --- NEW TOOLS ---
server.tool(
  "get_team",
  { team_id: z.string().describe("Team ID") },
  async ({ team_id }) => {
    const client = getClient();
    const response = await client.teams.getTeam(team_id);
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "list_apis",
  { project_id: z.string().describe("Project ID") },
  async ({ project_id }) => {
    const client = getClient();
    const response = await client.apis.getProjectApis(project_id);
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_api_endpoints",
  { api_id: z.string().describe("API ID") },
  async ({ api_id }) => {
    const client = getClient();
    const response = await client.apis.getApiEndpoints(api_id);
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_api",
  { api_id: z.string().describe("ID of the API") },
  async ({ api_id }) => {
    const client = getClient();
    const response = await client.apis.getApi(api_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "create_api",
  {
    project_id: z.string().describe("Project ID to associate the API with"),
    name: z.string().describe("Name for the API"),
    base_path: z
      .string()
      .describe("Base path for the API (e.g., 'my-service')"),
    version: z.string().describe("API version (e.g., 'v1')"),
    description: z.string().optional().describe("API description"),
  },
  async (params) => {
    const client = getClient();
    const response = await client.apis.createApi({
      projectId: params.project_id,
      name: params.name,
      basePath: params.base_path,
      version: params.version,
      description: params.description,
    });
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "update_api",
  {
    api_id: z.string().describe("ID of the API to update"),
    name: z.string().optional().describe("New name for the API"),
    description: z.string().optional().describe("New description"),
    base_path: z.string().optional().describe("New base path"),
    version: z.string().optional().describe("New version"),
    status: z
      .enum(["draft", "published", "deprecated"])
      .optional()
      .describe("New status"),
  },
  async (params) => {
    const client = getClient();
    const { api_id, base_path, ...updateData } = params;
    const sdkParams = {
      // Map to camelCase
      ...updateData,
      ...(base_path && { basePath: base_path }),
    };
    const response = await client.apis.updateApi(api_id, sdkParams);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "delete_api",
  { api_id: z.string().describe("ID of the API to delete") },
  async ({ api_id }) => {
    const client = getClient();
    const response = await client.apis.deleteApi(api_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "create_api_endpoint",
  {
    api_id: z.string().describe("ID of the API to add the endpoint to"),
    endpoint_name: z.string().describe("Name for the endpoint"),
    http_method: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
      .describe("HTTP method"),
    path: z
      .string()
      .describe("Endpoint path relative to API base path (e.g., '/users')"),
    queryprogram_id: z.string().describe("ID of the Query Program to link"),
    description: z.string().optional().describe("Endpoint description"),
    operation_id: z
      .string()
      .optional()
      .describe("Unique operation ID (for OpenAPI spec)"),
  },
  async (params) => {
    const client = getClient();
    const response = await client.apis.createApiEndpoint({
      apiId: params.api_id,
      endpointName: params.endpoint_name,
      httpMethod: params.http_method,
      path: params.path,
      queryprogramId: params.queryprogram_id,
      description: params.description,
      operationId: params.operation_id,
    });
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_api_endpoint",
  { endpoint_id: z.string().describe("ID of the API endpoint") },
  async ({ endpoint_id }) => {
    const client = getClient();
    const response = await client.apis.getApiEndpoint(endpoint_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "update_api_endpoint",
  {
    endpoint_id: z.string().describe("ID of the API endpoint to update"),
    endpoint_name: z.string().optional().describe("New name"),
    description: z.string().optional().describe("New description"),
    http_method: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
      .optional()
      .describe("New HTTP method"),
    path: z.string().optional().describe("New path"),
    queryprogram_id: z.string().optional().describe("New Query Program ID"),
    operation_id: z.string().optional().describe("New operation ID"),
  },
  async (params) => {
    const client = getClient();
    const {
      endpoint_id,
      endpoint_name,
      http_method,
      queryprogram_id,
      operation_id,
      ...updateData
    } = params;
    const sdkParams = {
      // Map to camelCase
      ...updateData,
      ...(endpoint_name && { endpointName: endpoint_name }),
      ...(http_method && { httpMethod: http_method }),
      ...(queryprogram_id && { queryprogramId: queryprogram_id }),
      ...(operation_id && { operationId: operation_id }),
    };
    const response = await client.apis.updateApiEndpoint(
      endpoint_id,
      sdkParams,
    );
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "delete_api_endpoint",
  { endpoint_id: z.string().describe("ID of the API endpoint to delete") },
  async ({ endpoint_id }) => {
    const client = getClient();
    const response = await client.apis.deleteApiEndpoint(endpoint_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "list_organizations", // Changed name for clarity
  { _empty: z.object({}).optional() },
  async (_args, _extra) => {
    const client = getClient();
    const response = await client.organizations.list(); // Use the list method
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_organization",
  { organization_id: z.string().describe("Organization ID") },
  async ({ organization_id }) => {
    const client = getClient();
    const response = await client.organizations.get(organization_id); // Use the get method
    // Await formatResponse
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

// Dataline tools
server.tool(
  "list_datalines",
  {
    project_id: z.string().describe("Project ID to list datalines for"),
    datasource_id: z
      .string()
      .optional()
      .describe("Optional: Filter by Datasource ID"),
  },
  async ({ project_id, datasource_id }) => {
    const client = getClient();
    // Choose the correct SDK method based on whether datasource_id is provided
    const response = datasource_id
      ? await client.datalines.getDatalines(datasource_id) // Filter by datasource
      : await client.datalines.getProjectDatalines(project_id); // Get all for project
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

server.tool(
  "get_dataline",
  { dataline_id: z.string().describe("ID of the dataline") },
  async ({ dataline_id }) => {
    const client = getClient();
    const response = await client.datalines.getDataline(dataline_id);
    return {
      content: [{ type: "text", text: await formatResponse(response) }],
    };
  },
);

// Start server
async function runServer() {
  const transport = new StdioServerTransport();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.info("Shutting down server..."); // Use console.info for consistency
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.info("Shutting down server..."); // Handle SIGTERM too
    process.exit(0);
  });

  try {
    console.info("Infactory MCP server starting..."); // Added startup message
    // Start receiving messages on stdin and sending messages on stdout
    await server.connect(transport);
    console.info("Infactory MCP server connected and listening.");
  } catch (error) {
    console.error("Server error:", error);
    process.exit(1);
  }
}

runServer();
