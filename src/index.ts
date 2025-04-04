import { InfactoryClient } from "@infactory/infactory-ts";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


function getApiKey(): string {
  const apiKey = process.env.NF_API_KEY;
  if (!apiKey) {
    console.error("NF_API_KEY environment variable is not set");
    process.exit(1);
  }
  return apiKey;
}

const NF_API_KEY = getApiKey();

// const client = new InfactoryClient({
//   apiKey: NF_API_KEY
// });

// Create an MCP server
const client = new InfactoryClient({
  apiKey: NF_API_KEY
});

// Create an MCP server
const server = new McpServer({
  name: "Infactory MCP Server",
  version: "0.0.2",  // Make sure this aligns with package.json
  description: "MCP server for Infactory integration"
});

// Add an addition tool
server.tool("add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

// Add a dynamic greeting resource
server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      type: "text/plain",
      text: `Hello, ${name}! Welcome to Infactory MCP Server.`
    }]
  })
);

async function runServer() {
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // console.info("Infactory MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Infactory MCP Server Fatal error running server:", error);
  process.exit(1);
});
