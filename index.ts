#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  InfactoryClient,
  ApiResponse,
  isReadableStream,
  processStreamToApiResponse,
} from "@infactory/infactory-ts";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Version                                                           */
/* ------------------------------------------------------------------ */
const VERSION = "0.7.0";

/* ------------------------------------------------------------------ */
/*  Authenticated client helper                                       */
/* ------------------------------------------------------------------ */
function getClient(): InfactoryClient {
  const apiKey = process.env.NF_API_KEY;
  if (!apiKey) throw new Error("NF_API_KEY environment variable is required");
  return new InfactoryClient({
    apiKey,
    baseURL: process.env.NF_BASE_URL, // SDK’s default is fine if unset
  });
}

/* ------------------------------------------------------------------ */
/*  Response normaliser                                               */
/* ------------------------------------------------------------------ */
async function fmt<T>(
  r: ApiResponse<T> | ReadableStream<Uint8Array>,
): Promise<string> {
  if (isReadableStream(r)) {
    const p = await processStreamToApiResponse(r);
    if (p.error) return `Error: ${p.error.message}`;
    return JSON.stringify(p.data ?? null, null, 2);
  }
  if (r.error) return `Error: ${r.error.message}`;
  return JSON.stringify(r.data ?? null, null, 2);
}

// Helper to wrap API responses in MCP content format
const wrap = async <T>(
  f: () => Promise<ApiResponse<T> | ReadableStream<Uint8Array>>,
) => ({
  content: [{ type: "text", text: await fmt((await f()) as any) }],
});

/* ------------------------------------------------------------------ */
/*  Action enums & Zod schemas                                        */
/* ------------------------------------------------------------------ */
const connectActions = [
  "create_project_and_connect",
  "connect_source",
  "import_project",
  "delete_source",
  "upload_csv",
  "test_connection",
] as const;
const queryActions = [
  "create",
  "get",
  "list",
  "update",
  "run",
  "generate_queries",
  "analyze",
  "update_schema",
  "get_ontology",
] as const;
const deployActions = [
  "publish_query",
  "unpublish_query",
  "create_api",
  "get_api",
  "list_apis",
  "update_api",
  "delete_api",
  "create_endpoint",
  "get_endpoint",
  "list_endpoints",
  "update_endpoint",
  "delete_endpoint",
  "list_published_queries",
] as const;
const exploreActions = [
  "create_conversation",
  "get_conversation",
  "list_conversations",
  "update_conversation",
  "delete_conversation",
  "send_message",
  "run_completion",
  "list_models",
] as const;
const settingsActions = [
  "get_org",
  "update_org",
  "invite_member",
  "revoke_invitation",
  "update_member_role",
  "remove_member",
  "list_api_keys",
  "create_api_key",
  "rename_api_key",
  "enable_api_key",
  "disable_api_key",
  "delete_api_key",
  "get_subscription",
  "get_usage",
  "update_overage",
  "preview_plan_change",
  "apply_plan_change",
  "cancel_subscription",
  "get_hosting_info",
] as const;

/** Generic “envelope” schema each tool accepts */
function envelopeSchema<A extends readonly string[]>(allowed: A) {
  // Create a tuple type from the array for z.enum
  // Cast to unknown first to avoid type errors
  const enumValues = [...allowed] as unknown as [string, ...string[]];
  return z.object({
    action: z.enum(enumValues),
    params: z.record(z.any()).optional(),
  });
}

/* ------------------------------------------------------------------ */
/*  Per-tool operation maps                                           */
/*  (Only the most commonly-used calls are wired in; extend freely)   */
/* ------------------------------------------------------------------ */
type Op = (p: Record<string, any>) => Promise<any>;

function connectMap(c: InfactoryClient): Record<string, Op> {
  return {
    // -- project & datasource bootstrap ---------------------------------
    create_project_and_connect: async (p) => {
      const proj = await c.projects.createProject({
        name: p.projectName,
        description: p.projectDescription,
        teamId: p.teamId,
      });
      if (proj.error) return proj;
      return c.datasources.createDatasource({
        name: p.sourceName,
        type: p.sourceType,
        projectId: proj.data!.id,
        uri: p.sourceConfig?.uri,
      });
    },
    connect_source: (p) =>
      c.datasources.createDatasource({
        name: p.sourceName,
        type: p.sourceType,
        projectId: p.projectId,
        uri: p.sourceConfig?.uri,
      }),
    delete_source: (p) =>
      c.datasources.deleteDatasource(p.sourceId, p.permanent ?? false),
    // -- CSV upload ------------------------------------------------------
    upload_csv: (p) => {
      // Adjust parameters according to SDK requirements
      return c.datasources.uploadDatasource(
        p.projectId, // project ID
        p.datasourceId || undefined, // datasource ID (optional)
        p.formData, // form data
        p.jobId || "", // job ID (optional)
      );
    },
    // -- Import project --------------------------------------------------
    import_project: (p) => {
      // The SDK expects a File object but we're likely getting a string path
      // We need to handle this with type assertions
      return c.projects.importProject(
        p.file as any,
        {
          teamId: p.teamId,
          conflictStrategy: p.conflictStrategy,
          renameSuffix: p.renameSuffix,
        } as any,
      );
    },
    // -- Connection test -------------------------------------------------
    test_connection: (p) => {
      // Type assertion needed for SDK compatibility
      const params = {
        type: p.sourceType,
        config: p.sourceConfig,
      } as any;
      return c.datasources.testDatabaseConnection(params);
    },
  };
}

function queryMap(c: InfactoryClient): Record<string, Op> {
  return {
    create: (p) =>
      c.queryPrograms.createQueryProgram({
        projectId: p.projectId,
        name: p.name,
        query: p.code,
      }),
    get: (p) => c.queryPrograms.getQueryProgram(p.queryProgramId),
    list: (p) => {
      // Type assertion needed for SDK compatibility
      const options = { projectId: p.projectId } as any;
      return c.queryPrograms.listQueryPrograms(options);
    },
    update: (p) =>
      c.queryPrograms.updateQueryProgram(p.queryProgramId, {
        query: p.code,
        published: p.publish,
      }),
    run: (p) => {
      return (async () => {
        // The SDK might have different method names in different versions
        // Try to use the method that exists in the SDK
        if ("executeQueryProgram" in c.queryPrograms) {
          return (c.queryPrograms as any).executeQueryProgram(
            p.queryProgramId,
            p.input_data,
          );
        } else if ("evaluateQueryProgram" in c.queryPrograms) {
          return (c.queryPrograms as any).evaluateQueryProgram(
            p.queryProgramId,
            p.input_data,
          );
        } else {
          // Fallback to a generic method call with type assertion
          return (c.queryPrograms as any).runQuery(
            p.queryProgramId,
            p.input_data,
          );
        }
      })();
    },
    generate_queries: (p) =>
      c.generate.generateQuestions({
        projectId: p.projectId,
        count: p.count,
      }),
    analyze: (p) => {
      // Type assertion needed for SDK compatibility
      const options = { projectId: p.projectId } as any;
      return c.queryPrograms.analyzeQueryProgram(p.queryProgramId, options);
    },
    update_schema: (p) =>
      c.datalines.updateDatalineSchema(p.datalineId, p.schemaData),
    get_ontology: (p) => c.datasources.getOntologyGraph(p.datasourceId),
  };
}

function deployMap(c: InfactoryClient): Record<string, Op> {
  return {
    publish_query: (p) => c.queryPrograms.publishQueryProgram(p.queryProgramId),
    unpublish_query: (p) =>
      c.queryPrograms.unpublishQueryProgram(p.queryProgramId),
    list_published_queries: (p) =>
      c.apis.getProjectPublishedPrograms(p.projectId),
    // API lifecycle
    create_api: (p) =>
      c.apis.createApi({ projectId: p.projectId, ...p.apiData }),
    list_apis: (p) => c.apis.getProjectApis(p.projectId),
    get_api: (p) => c.apis.getApi(p.apiId),
    update_api: (p) => c.apis.updateApi(p.apiId, p.apiData),
    delete_api: (p) => c.apis.deleteApi(p.apiId),
    // Endpoint lifecycle
    create_endpoint: (p) => c.apis.createApiEndpoint(p.endpointData),
    list_endpoints: (p) => c.apis.getApiEndpoints(p.apiId),
    get_endpoint: (p) => c.apis.getApiEndpoint(p.endpointId),
    update_endpoint: (p) =>
      c.apis.updateApiEndpoint(p.endpointId, p.endpointData),
    delete_endpoint: (p) => c.apis.deleteApiEndpoint(p.endpointId),
  };
}

function exploreMap(c: InfactoryClient): Record<string, Op> {
  return {
    create_conversation: (p) =>
      c.chat.createConversation({
        projectId: p.projectId,
        title: p.title,
      }),
    list_conversations: (p) => c.chat.getProjectConversations(p.projectId),
    get_conversation: (p) => c.chat.getConversation(p.conversationId),
    update_conversation: (p) =>
      c.chat.updateConversation(p.conversationId, { title: p.title }),
    delete_conversation: (p) => c.chat.deleteConversation(p.conversationId),
    send_message: (p) => {
      const messageParams: any = {
        conversationId: p.conversationId,
        projectId: p.projectId,
        content: p.messageContent,
        queryprogramId: p.queryprogramId || null,
        authorRole: p.authorRole,
        contentType: p.contentType || "text",
        authorUserId: p.authorUserId || null,
        parentMessageId: p.parentMessageId || null,
        apiEndpoints: p.apiEndpoints || null,
        model: p.model,
        temperature: p.temperature,
        maxTokens: p.maxTokens || null,
        topP: p.topP,
        frequencyPenalty: p.frequencyPenalty,
        presencePenalty: p.presencePenalty,
        noReply: p.noReply,
      };
      return c.chat.sendMessage(p.conversationId, messageParams);
    },
    run_completion: (p) =>
      c.integrations.createChatCompletion(p.projectId, {
        messages: p.messages,
        model: p.modelId,
        stream: p.stream,
      }),
    list_models: (p) => c.integrations.getChatModels(p.projectId),
  };
}

function settingsMap(c: InfactoryClient): Record<string, Op> {
  return {
    get_org: (p) => c.organizations.get(p.organizationId),
    update_org: (p) =>
      c.organizations.update(p.organizationId, { name: p.orgName }),
    invite_member: (p) =>
      c.organizations.create({
        // placeholder: real invite lives in auth service
        name: "invite",
      }),
    list_api_keys: () => c.auth.getApiKeys(),
    create_api_key: (p) => c.auth.createApiKey(p.apiKeyName),
    rename_api_key: (p) => c.auth.renameApiKey(p.apiKeyId, p.apiKeyName),
    enable_api_key: (p) => c.auth.enableApiKey(p.apiKeyId),
    disable_api_key: (p) => c.auth.disableApiKey(p.apiKeyId),
    delete_api_key: (p) => c.auth.deleteApiKey(p.apiKeyId),
    get_subscription: () => {
      // Type assertion needed for SDK compatibility
      return c.subscriptions.getSubscription({} as any);
    },
    get_usage: () => {
      // Type assertion needed for SDK compatibility
      return c.subscriptions.getUsage({} as any);
    },
    get_hosting_info: () => c.platforms.get(c.getBaseURL()),
  };
}

/* ------------------------------------------------------------------ */
/*  MCP server setup                                                  */
/* ------------------------------------------------------------------ */
const server = new McpServer({
  name: "infactory-mcp",
  version: VERSION,
});

/** Utility to register one high-level tool */
function register<A extends readonly string[]>(
  toolName: string,
  allowed: A,
  builder: (c: InfactoryClient) => Record<string, Op>,
) {
  // Extract the schema properties for server.tool
  const schema = {
    action: z.enum([...allowed] as unknown as [string, ...string[]]),
    params: z.record(z.any()).optional(),
  };

  // Convert schema to ZodRawShape format for server.tool
  const rawSchema = {
    action: schema.action,
    params: schema.params,
  };

  server.tool(
    toolName,
    rawSchema, // Pass the schema in the expected format
    async (args, extra) => {
      const { action, params = {} } = args;
      const client = getClient();
      const map = builder(client);
      const fn = map[action as string];
      if (!fn) {
        return {
          content: [
            {
              type: "text",
              text: `Error: unknown ${toolName} action "${action}"`,
            },
          ],
        };
      }
      try {
        const result = await fn(params);
        return {
          content: [{ type: "text", text: await fmt(result as any) }],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

/* Register the five verbs */
register("connect", connectActions, connectMap);
register("query", queryActions, queryMap);
register("deploy", deployActions, deployMap);
register("explore", exploreActions, exploreMap);
register("settings", settingsActions, settingsMap);

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                         */
/* ------------------------------------------------------------------ */
(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
})();
