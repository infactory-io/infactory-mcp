#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */

// This is a work in progress, minimal version of the MCP
// that tries to hierarchically structure the code.

import {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  InfactoryClient,
  ApiResponse,
  isReadableStream,
  processStreamToApiResponse,
} from "@infactory/infactory-ts";
import { z, ZodRawShape, ZodTypeAny } from "zod";

/* ------------------------------------------------------------------ */
/*  Version                                                           */
/* ------------------------------------------------------------------ */
const VERSION = "0.7.3";

/* ------------------------------------------------------------------ */
/*  Authenticated client helper                                       */
/* ------------------------------------------------------------------ */
function getClient(): InfactoryClient {
  const apiKey = process.env.NF_API_KEY;
  if (!apiKey) throw new Error("NF_API_KEY environment variable is required");
  return new InfactoryClient({ apiKey, baseURL: process.env.NF_BASE_URL });
}

/* ------------------------------------------------------------------ */
/*  Response → text helper                                            */
/* ------------------------------------------------------------------ */
async function fmt<T>(
  r: ApiResponse<T> | ReadableStream<Uint8Array>,
): Promise<string> {
  if (isReadableStream(r)) {
    const p = await processStreamToApiResponse(r);
    return p.error
      ? `Error: ${p.error.message}`
      : JSON.stringify(p.data ?? null, null, 2);
  }
  return r.error
    ? `Error: ${r.error.message}`
    : JSON.stringify(r.data ?? null, null, 2);
}
const wrap = async <T>(
  f: () => Promise<ApiResponse<T> | ReadableStream<Uint8Array>>,
) => ({ content: [{ type: "text", text: await fmt(await f()) }] });

/* ------------------------------------------------------------------ */
/*  Action lists                                                      */
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
  "view_api_docs",
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

/* ------------------------------------------------------------------ */
/*  Helper to build param-schema envelope                             */
/* ------------------------------------------------------------------ */
function envelopeShape<A extends readonly string[]>(
  allowed: A,
  params: z.ZodObject<any> = z.object({}).passthrough(),
): ZodRawShape {
  return {
    action: z.enum([...allowed] as unknown as [A[number], ...A[number][]]),
    params,
  };
}

/* ------------------------------------------------------------------ */
/*  Per-tool PARAM schemas                                            */
/* ------------------------------------------------------------------ */
const connectParams = z
  .object({
    projectId: z.string().describe("Existing project ID").optional(),
    teamId: z.string().describe("Team ID").optional(),
    projectName: z.string().describe("Name for new project").optional(),
    projectDescription: z.string().optional(),
    sourceType: z.string().describe("Datasource type").optional(),
    sourceName: z.string().describe("Datasource display name").optional(),
    sourceConfig: z.record(z.any()).optional(),
    file: z.any().describe("File / Blob for import or CSV").optional(),
    formData: z.any().describe("Browser FormData for CSV upload").optional(),
    sourceId: z.string().describe("Datasource ID for deletion").optional(),
    permanent: z.boolean().optional(),
    conflictStrategy: z.enum(["rename", "overwrite", "fail"]).optional(),
    renameSuffix: z.string().optional(),
  })
  .passthrough();

const queryParams = z
  .object({
    projectId: z.string(),
    queryProgramId: z.string().optional(),
    code: z.string().describe("Query program code").optional(),
    name: z.string().optional(),
    publish: z.boolean().optional(),
    count: z.number().optional(),
    datalineId: z.string().optional(),
    schemaData: z.any().optional(),
    input_data: z.any().optional(),
    datasourceId: z.string().optional(),
  })
  .passthrough();

const deployParams = z
  .object({
    projectId: z.string().optional(),
    queryProgramId: z.string().optional(),
    apiId: z.string().optional(),
    endpointId: z.string().optional(),
    apiData: z.record(z.any()).optional(),
    endpointData: z.record(z.any()).optional(),
  })
  .passthrough();

const exploreParams = z
  .object({
    projectId: z.string().optional(),
    conversationId: z.string().optional(),
    title: z.string().optional(),
    messageContent: z.string().optional(),
    messages: z
      .array(z.object({ role: z.string(), content: z.string() }))
      .optional(),
    modelId: z.string().optional(),
    stream: z.boolean().optional(),
    apiId: z.string().optional(),
    queryprogramId: z.string().optional(),
    authorRole: z.string().optional(),
    contentType: z.string().optional(),
    apiEndpoints: z.any().optional(),
    temperature: z.number().optional(),
    topP: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),
    noReply: z.boolean().optional(),
  })
  .passthrough();

const settingsParams = z
  .object({
    organizationId: z.string().optional(),
    orgName: z.string().optional(),
    emailAddress: z.string().optional(),
    role: z.string().optional(),
    invitationId: z.string().optional(),
    memberUserId: z.string().optional(),
    apiKeyId: z.string().optional(),
    apiKeyName: z.string().optional(),
    productId: z.string().optional(),
    interval: z.enum(["month", "year"]).optional(),
    subscriptionItems: z.array(z.any()).optional(),
    prorationDate: z.number().optional(),
    overageEnabled: z.boolean().optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/*  Tool metadata (description + annotations + params schema)         */
/* ------------------------------------------------------------------ */
const toolMeta = {
  connect: {
    description:
      "Create projects, add/remove data sources, upload CSVs, import projects, and test source connectivity.",
    annotations: {
      title: "Connect data",
      readOnlyHint: false,
      destructiveHint: true,
    },
    paramsSchema: envelopeShape(connectActions, connectParams),
  },
  query: {
    description:
      "Lifecycle of Query Programs: create, list, update, run, generate questions, analyze plans, update schemas, fetch ontology.",
    annotations: {
      title: "Query",
      destructiveHint: false,
    },
    paramsSchema: envelopeShape(queryActions, queryParams),
  },
  deploy: {
    description:
      "Publish query programs and manage APIs / endpoints for external consumption.",
    annotations: {
      title: "Deploy",
      destructiveHint: true,
    },
    paramsSchema: envelopeShape(deployActions, deployParams),
  },
  explore: {
    description:
      "Conversational exploration of data; manage chat threads, send messages, run completions, list models, view API docs.",
    annotations: {
      title: "Explore",
      readOnlyHint: true,
    },
    paramsSchema: envelopeShape(exploreActions, exploreParams),
  },
  settings: {
    description:
      "Organization, subscription, API-key and other administrative operations.",
    annotations: {
      title: "Settings",
      destructiveHint: true,
    },
    paramsSchema: envelopeShape(settingsActions, settingsParams),
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Operation maps                                                    */
/* ------------------------------------------------------------------ */
type Op = (p: Record<string, any>) => Promise<any>;

function connectMap(c: InfactoryClient): Record<string, Op> {
  return {
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
    upload_csv: (p) =>
      c.datasources.uploadDatasource(
        p.projectId, // project ID
        p.datasourceId, // datasource ID (optional)
        p.formData, // form data
        p.jobId || "", // job ID (optional)
      ),
    import_project: (p) => {
      // The SDK expects a string but we might be getting a File object
      // Use type assertion to handle this safely
      return c.projects.importProject(
        p.file as any,
        {
          teamId: p.teamId,
          conflictStrategy: p.conflictStrategy,
          renameSuffix: p.renameSuffix,
        } as any,
      );
    },
    test_connection: (p) =>
      c.datasources.testDatabaseConnection({
        type: p.sourceType,
        config: p.sourceConfig,
      } as any),
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
    list: (p) => c.queryPrograms.listQueryPrograms({ projectId: p.projectId }),
    update: (p) =>
      c.queryPrograms.updateQueryProgram(p.queryProgramId, {
        query: p.code,
        published: p.publish,
      }),
    run: (p) =>
      ("executeQueryProgram" in c.queryPrograms
        ? (c.queryPrograms as any).executeQueryProgram
        : (c.queryPrograms as any).evaluateQueryProgram)(
        p.queryProgramId,
        p.input_data,
      ),
    generate_queries: (p) =>
      c.generate.generateQuestions({
        projectId: p.projectId,
        count: p.count,
      }),
    analyze: (p) =>
      c.queryPrograms.analyzeQueryProgram(p.queryProgramId, {
        projectId: p.projectId,
      } as any),
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
    create_api: (p) =>
      c.apis.createApi({ projectId: p.projectId, ...p.apiData }),
    list_apis: (p) => c.apis.getProjectApis(p.projectId),
    get_api: (p) => c.apis.getApi(p.apiId),
    update_api: (p) => c.apis.updateApi(p.apiId, p.apiData),
    delete_api: (p) => c.apis.deleteApi(p.apiId),
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
      c.explore.createConversation({ projectId: p.projectId, title: p.title }),
    list_conversations: (p) => c.explore.getProjectConversations(p.projectId),
    get_conversation: (p) => c.explore.getConversation(p.conversationId),
    update_conversation: (p) =>
      c.explore.updateConversation(p.conversationId, { title: p.title }),
    delete_conversation: (p) => c.explore.deleteConversation(p.conversationId),
    send_message: (p) =>
      c.explore.sendMessage(p.conversationId, {
        contentText: p.messageContent,
      } as any),
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
    invite_member: (p) => c.organizations.create({ name: "invite" }), // placeholder
    list_api_keys: () => c.auth.getApiKeys(),
    create_api_key: (p) => c.auth.createApiKey(p.apiKeyName),
    rename_api_key: (p) => c.auth.renameApiKey(p.apiKeyId, p.apiKeyName),
    enable_api_key: (p) => c.auth.enableApiKey(p.apiKeyId),
    disable_api_key: (p) => c.auth.disableApiKey(p.apiKeyId),
    delete_api_key: (p) => c.auth.deleteApiKey(p.apiKeyId),
    get_subscription: (p) => c.subscriptions.getSubscription(p.organizationId),
    get_usage: (p) => c.subscriptions.getUsage(p.organizationId),
    get_hosting_info: () => c.platforms.get(c.getBaseURL()),
  };
}
/* ------------------------------------------------------------------ */
/*  MCP server                                                        */
/* ------------------------------------------------------------------ */
const server = new McpServer({ name: "infactory-mcp", version: VERSION });

/* ------------------------------------------------------------------ */
/*  Manual server tool registrations                                  */
/* ------------------------------------------------------------------ */

// Connect tool
{
  const name = "connect";
  const { description, paramsSchema, annotations } = toolMeta[name];
  server.tool(name, description, paramsSchema, (async (
    args: any,
    _extra: any,
  ) => {
    const { action, params = {} } = args;
    const fn = connectMap(getClient())[action as string];
    return fn
      ? wrap(() => fn(params))
      : {
          content: [
            {
              type: "text",
              text: `Error: unknown ${name} action "${action}"`,
            },
          ],
        };
  }) as any);
}

// Query tool
{
  const name = "query";
  const { description, paramsSchema, annotations } = toolMeta[name];
  server.tool(name, description, paramsSchema, (async (
    args: any,
    _extra: any,
  ) => {
    const { action, params = {} } = args;
    const fn = queryMap(getClient())[action as string];
    return fn
      ? wrap(() => fn(params))
      : {
          content: [
            {
              type: "text",
              text: `Error: unknown ${name} action "${action}"`,
            },
          ],
        };
  }) as any);
}

// Deploy tool
{
  const name = "deploy";
  const { description, paramsSchema, annotations } = toolMeta[name];
  server.tool(name, description, paramsSchema, (async (
    args: any,
    _extra: any,
  ) => {
    const { action, params = {} } = args;
    const fn = deployMap(getClient())[action as string];
    return fn
      ? wrap(() => fn(params))
      : {
          content: [
            {
              type: "text",
              text: `Error: unknown ${name} action "${action}"`,
            },
          ],
        };
  }) as any);
}

// Explore tool
{
  const name = "explore";
  const { description, paramsSchema, annotations } = toolMeta[name];
  server.tool(name, description, paramsSchema, (async (
    args: any,
    _extra: any,
  ) => {
    const { action, params = {} } = args;
    const fn = exploreMap(getClient())[action as string];
    return fn
      ? wrap(() => fn(params))
      : {
          content: [
            {
              type: "text",
              text: `Error: unknown ${name} action "${action}"`,
            },
          ],
        };
  }) as any);
}

// Settings tool
{
  const name = "settings";
  const { description, paramsSchema, annotations } = toolMeta[name];
  server.tool(name, description, paramsSchema, (async (
    args: any,
    _extra: any,
  ) => {
    const { action, params = {} } = args;
    const fn = settingsMap(getClient())[action as string];
    return fn
      ? wrap(() => fn(params))
      : {
          content: [
            {
              type: "text",
              text: `Error: unknown ${name} action "${action}"`,
            },
          ],
        };
  }) as any);
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                         */
/* ------------------------------------------------------------------ */
(async () => {
  await server.connect(new StdioServerTransport());
})();
