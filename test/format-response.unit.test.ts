import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatResponse } from "../src/handlers.js";
import * as sdk from "@infactory/infactory-ts";

// Mock the SDK utilities
vi.mock("@infactory/infactory-ts", async () => {
  // Define a mock InfactoryAPIError class inside the mock to avoid hoisting issues
  class MockInfactoryAPIError {
    message: string;
    status: number;
    code: string;
    name: string;
    requestId?: string;
    details?: any;

    constructor(props: { message: string; status?: number; code?: string; details?: any; requestId?: string }) {
      this.message = props.message;
      this.status = props.status || 500;
      this.code = props.code || 'ERROR';
      this.name = 'InfactoryAPIError';
      this.requestId = props.requestId;
      this.details = props.details;
    }

    toJSON() {
      return {
        name: this.name,
        status: this.status,
        code: this.code,
        message: this.message,
        requestId: this.requestId,
        details: this.details
      };
    }
  }
  
  return {
    isReadableStream: vi.fn(),
    processStreamToApiResponse: vi.fn(),
    // Add other SDK exports as needed
    ApiResponse: class {},
    InfactoryAPIError: MockInfactoryAPIError
  };
});

describe("formatResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sdk.isReadableStream).mockReturnValue(false);
  });

  it("should format successful response with data", async () => {
    const mockData = { id: "test-id", name: "Test Item" };
    const mockResponse = { data: mockData, error: undefined };

    const result = await formatResponse(mockResponse as any);

    expect(result).toBe(JSON.stringify(mockData, null, 2));
  });

  it("should handle null data in response", async () => {
    const mockResponse = { data: null, error: undefined };

    const result = await formatResponse(mockResponse as any);

    expect(result).toBe(JSON.stringify(null, null, 2));
  });

  it("should format error response with message", async () => {
    const mockError = { 
      message: "Test error message",
      status: 500,
      code: "ERROR",
      name: "InfactoryAPIError",
      toJSON: () => ({ name: "InfactoryAPIError", status: 500, code: "ERROR", message: "Test error message", requestId: undefined, details: undefined })
    };
    const mockResponse = { data: null, error: mockError };

    const result = await formatResponse(mockResponse as any);

    expect(result).toBe(`Error: ${mockError.message}`);
  });

  it("should format error response with details", async () => {
    const mockError = {
      message: "Test error message",
      status: 500,
      code: "ERROR",
      name: "InfactoryAPIError",
      details: { code: "NOT_FOUND", resource: "project" },
      toJSON: () => ({ 
        name: "InfactoryAPIError", 
        status: 500, 
        code: "ERROR", 
        message: "Test error message",
        details: { code: "NOT_FOUND", resource: "project" }
      })
    };
    const mockResponse = { data: null, error: mockError };

    const result = await formatResponse(mockResponse as any);

    expect(result).toContain(`Error: ${mockError.message}`);
    expect(result).toContain(`Details: ${JSON.stringify(mockError.details)}`);
  });

  it("should handle error without message", async () => {
    const mockError = {
      message: "",
      status: 404,
      code: "404",
      name: "InfactoryAPIError",
      toJSON: () => ({ name: "InfactoryAPIError", status: 404, code: "404", message: "", requestId: undefined, details: undefined })
    };
    const mockResponse = { data: null, error: mockError };

    const result = await formatResponse(mockResponse as any);

    expect(result).toContain(`Error: `);
  });

  it("should handle streaming response success", async () => {
    const mockStream = new ReadableStream() as any;
    const mockProcessedData = { result: "Stream result" };

    vi.mocked(sdk.isReadableStream).mockReturnValue(true);
    vi.mocked(sdk.processStreamToApiResponse).mockResolvedValue({
      data: mockProcessedData,
      error: undefined,
    });

    const result = await formatResponse(mockStream);

    expect(sdk.isReadableStream).toHaveBeenCalledWith(mockStream);
    expect(sdk.processStreamToApiResponse).toHaveBeenCalledWith(mockStream);
    expect(result).toBe(JSON.stringify(mockProcessedData, null, 2));
  });

  it("should handle streaming response error", async () => {
    const mockStream = new ReadableStream() as any;
    const mockError = {
      message: "Stream processing error",
      status: 500,
      code: "STREAM_ERROR",
      name: "InfactoryAPIError",
      toJSON: () => ({ 
        name: "InfactoryAPIError", 
        status: 500, 
        code: "STREAM_ERROR", 
        message: "Stream processing error",
        requestId: undefined,
        details: undefined
      })
    };

    vi.mocked(sdk.isReadableStream).mockReturnValue(true);
    vi.mocked(sdk.processStreamToApiResponse).mockResolvedValue({
      data: null,
      error: mockError,
    });

    const result = await formatResponse(mockStream);

    expect(sdk.isReadableStream).toHaveBeenCalledWith(mockStream);
    expect(sdk.processStreamToApiResponse).toHaveBeenCalledWith(mockStream);
    expect(result).toBe(`Error: ${mockError.message}`);
  });

  it("should handle exception during stream processing", async () => {
    const mockStream = new ReadableStream() as any;
    const mockError = new Error("Stream processing exception");

    vi.mocked(sdk.isReadableStream).mockReturnValue(true);
    vi.mocked(sdk.processStreamToApiResponse).mockRejectedValue(mockError);

    const result = await formatResponse(mockStream);

    expect(sdk.isReadableStream).toHaveBeenCalledWith(mockStream);
    expect(sdk.processStreamToApiResponse).toHaveBeenCalledWith(mockStream);
    expect(result).toBe(`Error processing stream: ${mockError.message}`);
  });
});
