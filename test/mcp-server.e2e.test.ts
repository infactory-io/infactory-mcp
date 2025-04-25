import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

// Load environment variables from .env file
config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const distPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "dist",
  "index.js",
);

describe("Infactory MCP Server E2E", () => {
  let serverProcess: ChildProcessWithoutNullStreams;
  let responses: any[] = [];
  let errors: string[] = [];

  beforeAll(() => {
    serverProcess = spawn("node", [distPath], {
      env: { ...process.env }, // Pass environment variables
      stdio: ["pipe", "pipe", "pipe"],
    });

    serverProcess.stdout.on("data", (data) => {
      // Split potential multiple JSON objects per chunk
      const lines = data.toString().trim().split("\n");
      lines.forEach((line: string) => {
        try {
          if (line) responses.push(JSON.parse(line));
        } catch (e) {
          console.error("Failed to parse stdout line:", line, e);
          errors.push(`Failed to parse stdout: ${line}`);
        }
      });
    });

    serverProcess.stderr.on("data", (data) => {
      // Ignore specific info messages if needed, otherwise treat as errors
      const errText = data.toString();
      if (
        !errText.includes("Received stream, processing...") &&
        !errText.includes("Stream processed successfully.") &&
        !errText.includes("Infactory MCP server starting...") &&
        !errText.includes("Infactory MCP server connected and listening.")
      ) {
        console.error(`stderr: ${errText}`);
        errors.push(errText);
      }
    });
  });

  afterAll(() => {
    serverProcess.kill();
  });

  // Helper to send request and wait for response
  const sendRequest = (request: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const currentResponseCount = responses.length;
      const requestString = JSON.stringify(request) + "\n";
      serverProcess.stdin.write(requestString);

      const timeout = setTimeout(
        () =>
          reject(
            new Error(
              `Timeout waiting for response to request ID ${request.id}`,
            ),
          ),
        5000,
      ); // 5s timeout

      const interval = setInterval(() => {
        if (responses.length > currentResponseCount) {
          const response = responses.find((r) => r.id === request.id);
          if (response) {
            clearTimeout(timeout);
            clearInterval(interval);
            resolve(response);
          }
        }
        if (errors.length > 0) {
          // Check for errors during wait
          // Optional: Check if a specific error relates to this request
        }
      }, 100); // Check every 100ms
    });
  };

  it("should respond to list_projects tool call", async () => {
    const request = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "list_projects", arguments: {} },
      id: 1,
    };
    const response = await sendRequest(request);

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();
    expect(response.result.content).toBeInstanceOf(Array);
    expect(response.result.content[0].type).toBe("text");
    // Basic check - more specific checks require mocking or real API data
    expect(typeof response.result.content[0].text).toBe("string");
  });

  it("should respond to get_current_user tool call", async () => {
    const request = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "get_current_user", arguments: {} },
      id: 2,
    };
    const response = await sendRequest(request);

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(2);
    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();
    expect(response.result.content).toBeInstanceOf(Array);
    // Add more assertions based on expected user structure if mocking/using test API
  });

  it("should handle unknown tool calls gracefully", async () => {
    const request = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "non_existent_tool", arguments: {} },
      id: 3,
    };
    const response = await sendRequest(request);

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(3);
    expect(response.result).toBeUndefined();
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(-32601); // Method not found
    expect(response.error.message).toContain("Tool not found");
  });

  // Additional test for a tool with arguments
  it("should handle tool calls with arguments", async () => {
    const request = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "get_project",
        arguments: { project_id: "test-project-id" },
      },
      id: 4,
    };
    const response = await sendRequest(request);

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(4);
    // Note: This might fail if the project ID doesn't exist in the actual API
    // For real E2E testing, you'd need valid test data or a mock API server
  });
});
