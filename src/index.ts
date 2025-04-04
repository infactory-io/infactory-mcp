import { InfactoryClient } from "@infactory/infactory-ts";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Resource,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import * as dotenv from 'dotenv';

dotenv.config();

function getApiKey(): string {
  const apiKey = process.env.NF_API_KEY;
  if (!apiKey) {
    console.error("NF_API_KEY environment variable is not set");
    process.exit(1);
  }
  return apiKey;
}

const NF_API_KEY = getApiKey();

// Initialize the Infactory client
// const client = new InfactoryClient({
//   apiKey: NF_API_KEY
// });

// Define tool types
const ADD_TOOL: Tool = {
  name: "add",
  uri: "infactory:add",
  description: "Add two numbers together",
  inputSchema: {
    type: "object",
    properties: {
      a: {
        type: "number",
        description: "First number to add"
      },
      b: {
        type: "number",
        description: "Second number to add"
      }
    },
    required: ["a", "b"]
  }
};

const TOOLS = [
  ADD_TOOL
] as const;

const GREETING_RESOURCE: Resource = {
  name: "greeting",
  uri: "infactory:greeting:{name}",
  description: "Generate a greeting message for a person",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the person to greet"
      }
    },
    required: ["name"]
  }
};

const RESOURCES = [
  GREETING_RESOURCE
] as const;

// Create a server with the Server class instead of McpServer
const server = new Server(
  {
    name: "Infactory MCP Server!",
    version: "0.0.2",  // Make sure this aligns with package.json
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// Define handler functions for the tools
async function handleAdd(a: number, b: number) {
  return {
    content: [{
      type: "number",
      value: a + b
    }],
    isError: false
  };
}

async function handleGreeting(name: string) {
  return {
    content: [{
      type: "text",
      text: `Hello, ${name}! Welcome to Infactory MCP Server.`
    }],
    isError: false
  };
}

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
  resources: RESOURCES
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "add": {
        const { a, b } = request.params.arguments as { a: number, b: number };
        return await handleAdd(a, b);
      }

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function runServer() {
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Infactory MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Infactory MCP Server Fatal error running server:", error);
  process.exit(1);
});
