import {
  InfactoryClient,
  ApiResponse,
  isReadableStream,
  processStreamToApiResponse,
} from "@infactory/infactory-ts";

// Initialize Infactory client
export function getClient(): InfactoryClient {
  const apiKey = process.env.NF_API_KEY;
  if (!apiKey) {
    throw new Error("NF_API_KEY environment variable is required");
  }

  const baseURL = process.env.NF_BASE_URL || "https://api.infactory.ai";

  console.error("Using Infactory MCP Server:", baseURL);

  return new InfactoryClient({
    apiKey,
    baseURL,
  });
}

// Format API responses consistently, handles streams, now async
export async function formatResponse<T>(
  response: ApiResponse<T> | ReadableStream<Uint8Array>,
): Promise<string> {
  // Handle streaming responses
  if (isReadableStream(response)) {
    console.error("Received stream, processing..."); // Log to stderr
    try {
      const processedResponse = await processStreamToApiResponse<T>(response);
      if (processedResponse.error) {
        console.error("Stream processing error:", processedResponse.error);
        // Provide more detail from the specific error type if available
        const message =
          processedResponse.error.message ||
          JSON.stringify(processedResponse.error);
        const details = processedResponse.error.details
          ? ` Details: ${JSON.stringify(processedResponse.error.details)}`
          : "";
        return JSON.stringify({
          error: {
            message,
            details,
          },
        });
      }
      console.error("Stream processed successfully."); // Log to stderr
      if (
        typeof processedResponse.data === "string" &&
        processedResponse.data.startsWith("{")
      ) {
        return processedResponse.data;
      }
      return JSON.stringify(processedResponse.data, null, 2); // Handle potentially undefined data
    } catch (streamError) {
      console.error("Exception during stream processing:", streamError);
      return `Error processing stream: ${streamError instanceof Error ? streamError.message : String(streamError)}`;
    }
  }
  // Handle regular non-streaming responses
  if (response.error) {
    console.error("API Error:", response.error);
    const message = response.error.message || JSON.stringify(response.error);
    const details = response.error.details
      ? ` Details: ${JSON.stringify(response.error.details)}`
      : "";
    return `Error: ${message}${details}`;
  }
  return JSON.stringify(response.data ?? null, null, 2); // Handle potentially undefined data
}

// Project handlers
export async function listProjectsHandler(_args: any, _extra: any) {
  const client = getClient();
  const response = await client.projects.getProjects();
  return { content: [{ type: "text", text: await formatResponse(response) }] };
}

export async function getProjectHandler({
  project_id,
}: {
  project_id: string;
}) {
  const client = getClient();
  const response = await client.projects.getProject(project_id);
  return { content: [{ type: "text", text: await formatResponse(response) }] };
}

export async function createProjectHandler({
  name,
  description,
  team_id,
}: {
  name: string;
  description?: string;
  team_id: string;
}) {
  const client = getClient();
  const response = await client.projects.createProject({
    name,
    description,
    teamId: team_id, // SDK expects camelCase teamId
  });
  return { content: [{ type: "text", text: await formatResponse(response) }] };
}

// User handlers
export async function getCurrentUserHandler(_args: any, _extra: any) {
  const client = getClient();
  const response = await client.users.getCurrentUser();
  return { content: [{ type: "text", text: await formatResponse(response) }] };
}

// Query program handlers
export async function executeQueryProgramHandler({
  queryprogram_id,
  input_data,
}: {
  queryprogram_id: string;
  input_data?: any;
}) {
  const client = getClient();
  const response = await client.queryPrograms.executeQueryProgram(
    queryprogram_id,
    input_data, // Pass input_data directly as parameters
  );
  return {
    content: [{ type: "text", text: await formatResponse(response) }],
  };
}
