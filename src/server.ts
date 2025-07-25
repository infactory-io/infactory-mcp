import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { InfactoryClient } from "@infactory/infactory-ts";
import { z } from "zod";
import * as dotenv from "dotenv";
import { QUICKSTART_CSV_GUIDE } from "./resources/quickstart_csv.js";

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

// --- Configuration and Environment Setup ---

interface DxtConfig {
  NF_API_KEY?: string;
  NF_BASE_URL?: string;
}

function getConfiguration(): DxtConfig {
  // Load from environment variables (for DXT, these are set by the host)
  const config: DxtConfig = {
    NF_API_KEY: process.env.NF_API_KEY,
    NF_BASE_URL: process.env.NF_BASE_URL || "https://api.infactory.ai",
  };

  // Validate required configuration
  if (!config.NF_API_KEY) {
    throw new Error(
      "🔴 FATAL: NF_API_KEY environment variable not set. Please configure your Infactory API key in the extension settings."
    );
  }

  return config;
}

// --- Main Server Creation Function ---

export const createServer = () => {
  // Load environment variables
  dotenv.config();

  // Get and validate configuration
  const config = getConfiguration();

  // Initialize Infactory client
  const client = new InfactoryClient({
    apiKey: config.NF_API_KEY!,
    baseURL: config.NF_BASE_URL,
  });

  const server = new McpServer(
    {
      name: "infactory-quickstart-mcp-server",
      version: "1.1.0",
    },
    {
      capabilities: { tools: {} },
      instructions:
        "This server provides tools to interact with the Infactory API, enabling the full quickstart workflow from project creation to data analysis and API deployment. All tools require proper authentication via NF_API_KEY.",
    },
  );

  // --- Helper Functions ---

  const formatResponse = (data: any, error?: any): CallToolResult => {
    if (error) {
      console.error("Tool execution error:", error);
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message || 'Unknown error occurred'}` 
        }],
        isError: true,
      };
    }
    
    try {
      const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      return { content: [{ type: "text", text }] };
    } catch (serializationError) {
      console.error("Response serialization error:", serializationError);
      return {
        content: [{ 
          type: "text", 
          text: "Error: Failed to serialize response data" 
        }],
        isError: true,
      };
    }
  };

  const getDefaultTeamId = async (): Promise<string> => {
    try {
      const userResponse = await client.users.getCurrentUser();
      if (userResponse.error || !userResponse.data?.userTeams?.[0]?.teamId) {
        throw new Error("Could not get default team ID for the current user. Please check your API key and permissions.");
      }
      return userResponse.data.userTeams[0].teamId;
    } catch (error) {
      console.error("Error getting default team ID:", error);
      throw new Error(`Failed to get default team ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const withTimeout = async <T>(
    promise: Promise<T>,
    timeoutMs: number = 30000,
    operation: string
  ): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
      console.error(`Timeout or error in ${operation}:`, error);
      throw error;
    }
  };

  // --- Resource Definition ---
  
  server.registerResource(
    "quickstart-csv",
    "infactory://guides/quickstart-csv",
    {
      title: "Guide: CSV Upload and Analysis",
      description: "A step-by-step guide for an AI agent to upload and analyze a CSV file using this server's tools.",
      mimeType: "text/markdown"
    },
    async (uri): Promise<ReadResourceResult> => {
      return {
        contents: [{
          uri: uri.href,
          text: QUICKSTART_CSV_GUIDE
        }]
      };
    }
  );
  
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
      try {
        const response = await withTimeout(
          client.users.getCurrentUser(),
          10000,
          "get_current_user"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a new project in a specified team.",
      inputSchema: UserAndProjectManagementSchema.CreateProject.shape,
    },
    async ({ name, teamId }) => {
      try {
        const finalTeamId = teamId || (await getDefaultTeamId());
        const response = await withTimeout(
          client.projects.createProject({
            name,
            teamId: finalTeamId,
          }),
          15000,
          "create_project"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
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
      try {
        const finalTeamId = teamId || (await getDefaultTeamId());
        const response = await withTimeout(
          client.projects.getProjects(finalTeamId),
          10000,
          "list_projects"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  server.registerTool(
    "delete_project",
    {
      description: "Delete a project by its ID.",
      inputSchema: UserAndProjectManagementSchema.DeleteProject.shape,
    },
    async ({ projectId }) => {
      try {
        const response = await withTimeout(
          client.projects.deleteProject(projectId, true), // Hard delete
          10000,
          "delete_project"
        );
        return formatResponse({ success: !response.error }, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
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
      try {
        const response = await withTimeout(
          client.datasources.uploadCsvFile(
            projectId,
            filePath,
            10,
            datasourceName,
          ),
          60000, // Longer timeout for file upload
          "upload_csv"
        );
        return formatResponse(response);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  server.registerTool(
    "get_datasource_status",
    {
      description: "Check the processing status of a datasource.",
      inputSchema: DataManagementSchema.GetDatasourceStatus.shape,
    },
    async ({ datasourceId }) => {
      try {
        const response = await withTimeout(
          client.datasources.getDatasource(datasourceId),
          10000,
          "get_datasource_status"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  server.registerTool(
    "delete_datasource",
    {
      description: "Delete a datasource by its ID.",
      inputSchema: DataManagementSchema.DeleteDatasource.shape,
    },
    async ({ datasourceId }) => {
      try {
        const response = await withTimeout(
          client.datasources.deleteDatasource(datasourceId),
          10000,
          "delete_datasource"
        );
        return formatResponse({ success: !response.error }, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
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
      try {
        const response = await withTimeout(
          client.build.createCues({
            projectId,
            count,
            guidance,
            previousQuestions: [],
          }),
          30000,
          "autogenerate_queries"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
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
      try {
        const response = await withTimeout(
          client.build.createQueryProgram({
            projectId,
            question,
          }),
          30000,
          "create_query_from_nl"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  server.registerTool(
    "list_query_programs",
    {
      description: "List all query programs in a project.",
      inputSchema: QueryBuildingSchema.ListQueryPrograms.shape,
    },
    async ({ projectId }) => {
      try {
        const response = await withTimeout(
          client.queryPrograms.listQueryPrograms({
            projectId,
          }),
          10000,
          "list_query_programs"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
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
      try {
        const response = await withTimeout(
          client.queryPrograms.evaluateQueryProgramSync(
            projectId,
            queryProgramId,
          ),
          60000, // Longer timeout for query execution
          "run_query_program"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
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
      try {
        const response = await withTimeout(
          client.queryPrograms.publishQueryProgram(queryProgramId),
          30000,
          "publish_query_program"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
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
      try {
        const response = await withTimeout(
          client.apis.getProjectApis(projectId),
          10000,
          "list_apis"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  server.registerTool(
    "list_api_endpoints",
    {
      description: "List all endpoints for a specific deployed API.",
      inputSchema: APIManagementSchema.ListApiEndpoints.shape,
    },
    async ({ apiId }) => {
      try {
        const response = await withTimeout(
          client.apis.getApiEndpoints(apiId),
          10000,
          "list_api_endpoints"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  server.registerTool(
    "call_live_api",
    {
      description: "Call a live, deployed API endpoint.",
      inputSchema: APIManagementSchema.CallLiveApi.shape,
    },
    async ({ apiSlug, version, path, params }) => {
      try {
        const response = await withTimeout(
          client.live.callCustomEndpoint(
            apiSlug,
            version,
            path,
            params,
          ),
          30000,
          "call_live_api"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
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
      try {
        const response = await withTimeout(
          client.explore.createConversation({ projectId }),
          15000,
          "create_conversation"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  server.registerTool(
    "send_chat_message",
    {
      description: "Send a message within an Explore chat session.",
      inputSchema: ChatAndExploreSchema.SendChatMessage.shape,
    },
    async ({ conversationId, projectId, content }) => {
      try {
        const stream = await withTimeout(
          client.explore.sendMessage(conversationId, {
            conversationId,
            projectId,
            content,
          }),
          60000, // Longer timeout for streaming
          "send_chat_message"
        );

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += decoder.decode(value);
        }
        
        return formatResponse(fullResponse);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  server.registerTool(
    "get_conversation_graph",
    {
      description: "Retrieve the interaction graph for a conversation.",
      inputSchema: ChatAndExploreSchema.GetConversationGraph.shape,
    },
    async ({ conversationId }) => {
      try {
        const response = await withTimeout(
          client.explore.getConversationGraph(conversationId),
          15000,
          "get_conversation_graph"
        );
        return formatResponse(response.data, response.error);
      } catch (error) {
        return formatResponse(null, error);
      }
    },
  );

  return { 
    server, 
    cleanup: async () => {
      // Cleanup function for graceful shutdown
      console.error("Infactory MCP Server shutting down gracefully...");
    } 
  };
};
