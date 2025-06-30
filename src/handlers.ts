import {
  ApiResponse,
  isReadableStream,
  processStreamToApiResponse,
} from "@infactory/infactory-ts";

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
        const message =
          processedResponse.error.message ||
          JSON.stringify(processedResponse.error);
        const details = processedResponse.error.details
          ? ` Details: ${JSON.stringify(processedResponse.error.details)}`
          : "";
        return `Error: ${message}${details}`;
      }
      console.error("Stream processed successfully."); // Log to stderr
      // Check if data is already a JSON string - avoid double stringify
      if (
        typeof processedResponse.data === "string" &&
        (processedResponse.data.startsWith("{") ||
          processedResponse.data.startsWith("["))
      ) {
        try {
          // Validate if it's actually JSON before returning raw
          JSON.parse(processedResponse.data);
          return processedResponse.data;
        } catch (e) {
          // If not valid JSON, stringify it
          return JSON.stringify(processedResponse.data, null, 2);
        }
      }
      return JSON.stringify(processedResponse.data ?? null, null, 2);
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
  // Check if data is already a JSON string - avoid double stringify
  if (
    typeof response.data === "string" &&
    (response.data.startsWith("{") || response.data.startsWith("["))
  ) {
    try {
      JSON.parse(response.data);
      return response.data;
    } catch (e) {
      return JSON.stringify(response.data, null, 2);
    }
  }
  return JSON.stringify(response.data ?? null, null, 2);
}
