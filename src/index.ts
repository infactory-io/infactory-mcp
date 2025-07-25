#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  const transport = new StdioServerTransport();
  // The new McpServer class handles much of the boilerplate
  const { server, cleanup } = createServer();

  await server.connect(transport);
  console.error("Infactory Quickstart MCP Server running on stdio");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await cleanup();
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
