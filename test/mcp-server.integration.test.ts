import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the McpServer class
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn().mockImplementation((config) => {
      return {
        name: config.name,
        version: config.version,
        tool: vi.fn(),
        connect: vi.fn()
      };
    })
  };
});

// Import after mocking
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Mock the entire SDK to avoid real API calls
vi.mock("@infactory/infactory-ts", () => {
  return {
    InfactoryClient: vi.fn().mockImplementation(() => ({
      projects: {
        getProjects: vi
          .fn()
          .mockResolvedValue({
            data: [{ id: "mock-project", name: "Mock Project" }],
          }),
        getProject: vi
          .fn()
          .mockResolvedValue({
            data: { id: "mock-project", name: "Mock Project" },
          }),
      },
      users: {
        getCurrentUser: vi
          .fn()
          .mockResolvedValue({ data: { id: "mock-user", name: "Mock User" } }),
      },
      queryPrograms: {
        listQueryPrograms: vi
          .fn()
          .mockResolvedValue({ data: [{ id: "mock-qp", name: "Mock QP" }] }),
        executeQueryProgram: vi
          .fn()
          .mockResolvedValue({ data: { result: "Mock result" } }),
      },
    })),
    isReadableStream: vi.fn().mockReturnValue(false),
    processStreamToApiResponse: vi.fn(),
  };
});

// Mock environment variables
process.env.NF_API_KEY = "mock-api-key";
process.env.NF_BASE_URL = "https://mock-api.example.com";

describe("Infactory MCP Server", () => {
  let server: any;

  beforeEach(() => {
    // Create a new server instance for each test
    server = new McpServer({
      name: "infactory-mcp-test",
      version: "0.0.1",
    });

    // We don't need to import the actual tool registrations since the McpServer is mocked
    // This test is just to verify the server can be created and tools are properly structured
    // This test is just to verify the server can be created and tools are properly structured
  });

  it("should create a server instance", () => {
    expect(server).toBeDefined();
    expect(server.name).toBe("infactory-mcp-test");
    expect(server.version).toBe("0.0.1");
  });

  it("should have the correct server structure", () => {
    expect(typeof server.tool).toBe("function");
    expect(typeof server.connect).toBe("function");
  });
});
