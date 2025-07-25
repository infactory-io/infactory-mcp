import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { InfactoryClient } from "@infactory/infactory-ts";
import { z } from "zod";
import * as dotenv from "dotenv";

// --- Zod Schemas for Tool Inputs ---

const UserAndProjectManagementSchema = {
  GetCurrentUser: z.object({}),
  CreateProject: z.object({
    name: z.string().describe("The name for the new project."),
    teamId: z
      .string()
      .optional()
      .describe(
        "Optional team ID. If not provided, the user's default team will be used.",
      ),
  }),
  ListProjects: z.object({
    teamId: z
      .string()
      .optional()
      .describe("Optional team ID to filter projects by."),
  }),
  DeleteProject: z.object({
    projectId: z.string().describe("The ID of the project to delete."),
  }),
};

const DataManagementSchema = {
  UploadCsv: z.object({
    projectId: z
      .string()
      .describe("The ID of the project to upload the data to."),
    filePath: z
      .string()
      .describe("The local file path of the CSV file to upload."),
    datasourceName: z
      .string()
      .describe("A descriptive name for the new datasource."),
  }),
  GetDatasourceStatus: z.object({
    datasourceId: z.string().describe("The ID of the datasource to check."),
  }),
  DeleteDatasource: z.object({
    datasourceId: z.string().describe("The ID of the datasource to delete."),
  }),
};

const QueryBuildingSchema = {
  AutogenerateQueries: z.object({
    projectId: z.string().describe("The ID of the project."),
    count: z
      .number()
      .int()
      .positive()
      .default(2)
      .describe("The number of queries to generate."),
    guidance: z
      .string()
      .optional()
      .describe("Optional guidance to steer query generation."),
  }),
  CreateQueryFromNL: z.object({
    projectId: z.string().describe("The ID of the project."),
    question: z
      .string()
      .describe(
        "The natural language question to convert into a query program.",
      ),
  }),
  ListQueryPrograms: z.object({
    projectId: z.string().describe("The ID of the project."),
  }),
};

const QueryExecutionSchema = {
  RunQueryProgram: z.object({
    projectId: z.string().describe("The ID of the project."),
    queryProgramId: z.string().describe("The ID of the query program to run."),
  }),
  PublishQueryProgram: z.object({
    queryProgramId: z
      .string()
      .describe("The ID of the query program to publish."),
  }),
};

const APIManagementSchema = {
  ListApis: z.object({
    projectId: z.string().describe("The ID of the project."),
  }),
  ListApiEndpoints: z.object({
    apiId: z.string().describe("The ID of the API."),
  }),
  CallLiveApi: z.object({
    apiSlug: z.string().describe("The slug of the published API."),
    version: z.string().describe("The version of the API."),
    path: z.string().describe("The endpoint path to call."),
    params: z
      .record(z.any())
      .optional()
      .describe("Optional query parameters for the request."),
  }),
};

const ChatAndExploreSchema = {
  CreateConversation: z.object({
    projectId: z
      .string()
      .describe("The ID of the project for the conversation."),
  }),
  SendChatMessage: z.object({
    conversationId: z.string().describe("The ID of the conversation."),
    projectId: z.string().describe("The ID of the project."),
    content: z.string().describe("The message content to send."),
  }),
  GetConversationGraph: z.object({
    conversationId: z.string().describe("The ID of the conversation."),
  }),
};

// --- Main Server Creation Function ---

export const createServer = () => {
  dotenv.config();

  const { NF_API_KEY, NF_BASE_URL } = process.env;
  if (!NF_API_KEY) {
    throw new Error("🔴 FATAL: NF_API_KEY environment variable not set.");
  }

  const client = new InfactoryClient({
    apiKey: NF_API_KEY,
    baseURL: NF_BASE_URL || "https://api.infactory.ai",
  });

  const server = new McpServer(
    {
      name: "infactory-quickstart-mcp-server",
      version: "1.1.0",
    },
    {
      capabilities: { tools: {} },
      instructions:
        "This server provides tools to interact with the Infactory API, enabling the full quickstart workflow from project creation to data analysis and API deployment.",
    },
  );

  // --- Helper Functions ---

  const formatResponse = (data: any, error?: any): CallToolResult => {
    if (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
    const text =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);
    return { content: [{ type: "text", text }] };
  };

  const getDefaultTeamId = async (): Promise<string> => {
    const userResponse = await client.users.getCurrentUser();
    if (userResponse.error || !userResponse.data?.userTeams?.[0]?.teamId) {
      throw new Error("Could not get default team ID for the current user.");
    }
    return userResponse.data.userTeams[0].teamId;
  };

  // --- Tool Definitions ---

  // User & Project Management
  server.registerTool(
    "get_current_user",
    {
      description:
        "Fetch the current authenticated user's profile to get team and organization info.",
      inputSchema: UserAndProjectManagementSchema.GetCurrentUser.shape,
    },
    async () => {
      const response = await client.users.getCurrentUser();
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a new project in a specified team.",
      inputSchema: UserAndProjectManagementSchema.CreateProject.shape,
    },
    async ({ name, teamId }) => {
      const finalTeamId = teamId || (await getDefaultTeamId());
      const response = await client.projects.createProject({
        name,
        teamId: finalTeamId,
      });
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "list_projects",
    {
      description:
        "List all projects for the user's default or a specified team.",
      inputSchema: UserAndProjectManagementSchema.ListProjects.shape,
    },
    async ({ teamId }) => {
      const finalTeamId = teamId || (await getDefaultTeamId());
      const response = await client.projects.getProjects(finalTeamId);
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "delete_project",
    {
      description: "Delete a project by its ID.",
      inputSchema: UserAndProjectManagementSchema.DeleteProject.shape,
    },
    async ({ projectId }) => {
      const response = await client.projects.deleteProject(projectId, true); // Hard delete
      return formatResponse({ success: !response.error }, response.error);
    },
  );

  // Data Management
  server.registerTool(
    "upload_csv",
    {
      description: "Upload a CSV file to a project, creating a new datasource.",
      inputSchema: DataManagementSchema.UploadCsv.shape,
    },
    async ({ projectId, filePath, datasourceName }) => {
      const response = await client.datasources.uploadCsvFile(
        projectId,
        filePath,
        10,
        datasourceName,
      );
      return formatResponse(response);
    },
  );

  server.registerTool(
    "get_datasource_status",
    {
      description: "Check the processing status of a datasource.",
      inputSchema: DataManagementSchema.GetDatasourceStatus.shape,
    },
    async ({ datasourceId }) => {
      const response = await client.datasources.getDatasource(datasourceId);
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "delete_datasource",
    {
      description: "Delete a datasource by its ID.",
      inputSchema: DataManagementSchema.DeleteDatasource.shape,
    },
    async ({ datasourceId }) => {
      const response = await client.datasources.deleteDatasource(datasourceId);
      return formatResponse({ success: !response.error }, response.error);
    },
  );

  // Query Building
  server.registerTool(
    "autogenerate_queries",
    {
      description: "Generate starter queries based on the data in a project.",
      inputSchema: QueryBuildingSchema.AutogenerateQueries.shape,
    },
    async ({ projectId, count, guidance }) => {
      const response = await client.build.createCues({
        projectId,
        count,
        guidance,
        previousQuestions: [],
      });
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "create_query_from_nl",
    {
      description:
        "Create a new query program from a natural language question.",
      inputSchema: QueryBuildingSchema.CreateQueryFromNL.shape,
    },
    async ({ projectId, question }) => {
      const response = await client.build.createQueryProgram({
        projectId,
        question,
      });
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "list_query_programs",
    {
      description: "List all query programs in a project.",
      inputSchema: QueryBuildingSchema.ListQueryPrograms.shape,
    },
    async ({ projectId }) => {
      const response = await client.queryPrograms.listQueryPrograms({
        projectId,
      });
      return formatResponse(response.data, response.error);
    },
  );

  // Query Execution & Deployment
  server.registerTool(
    "run_query_program",
    {
      description: "Execute a query program and get the results.",
      inputSchema: QueryExecutionSchema.RunQueryProgram.shape,
    },
    async ({ projectId, queryProgramId }) => {
      const response = await client.queryPrograms.evaluateQueryProgramSync(
        projectId,
        queryProgramId,
      );
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "publish_query_program",
    {
      description:
        "Publish a query program to make it available as a live API endpoint.",
      inputSchema: QueryExecutionSchema.PublishQueryProgram.shape,
    },
    async ({ queryProgramId }) => {
      const response =
        await client.queryPrograms.publishQueryProgram(queryProgramId);
      return formatResponse(response.data, response.error);
    },
  );

  // API Management
  server.registerTool(
    "list_apis",
    {
      description: "List all deployed APIs in a project.",
      inputSchema: APIManagementSchema.ListApis.shape,
    },
    async ({ projectId }) => {
      const response = await client.apis.getProjectApis(projectId);
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "list_api_endpoints",
    {
      description: "List all endpoints for a specific deployed API.",
      inputSchema: APIManagementSchema.ListApiEndpoints.shape,
    },
    async ({ apiId }) => {
      const response = await client.apis.getApiEndpoints(apiId);
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "call_live_api",
    {
      description: "Call a live, deployed API endpoint.",
      inputSchema: APIManagementSchema.CallLiveApi.shape,
    },
    async ({ apiSlug, version, path, params }) => {
      const response = await client.live.callCustomEndpoint(
        apiSlug,
        version,
        path,
        params,
      );
      return formatResponse(response.data, response.error);
    },
  );

  // Chat & Explore
  server.registerTool(
    "create_conversation",
    {
      description: "Start a new Explore chat session.",
      inputSchema: ChatAndExploreSchema.CreateConversation.shape,
    },
    async ({ projectId }) => {
      const response = await client.explore.createConversation({ projectId });
      return formatResponse(response.data, response.error);
    },
  );

  server.registerTool(
    "send_chat_message",
    {
      description: "Send a message within an Explore chat session.",
      inputSchema: ChatAndExploreSchema.SendChatMessage.shape,
    },
    async ({ conversationId, projectId, content }) => {
      const stream = await client.explore.sendMessage(conversationId, {
        conversationId,
        projectId,
        content,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value);
      }
      return formatResponse(fullResponse);
    },
  );

  server.registerTool(
    "get_conversation_graph",
    {
      description: "Retrieve the interaction graph for a conversation.",
      inputSchema: ChatAndExploreSchema.GetConversationGraph.shape,
    },
    async ({ conversationId }) => {
      const response =
        await client.explore.getConversationGraph(conversationId);
      return formatResponse(response.data, response.error);
    },
  );

  return { server, cleanup: async () => {} };
};
