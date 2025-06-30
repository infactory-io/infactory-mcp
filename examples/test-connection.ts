import { InfactoryClient } from "@infactory/infactory-ts";
import * as http from "http";

async function testConnection(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(url, { method: "HEAD", timeout: 3000 }, (res) => {
      resolve(true);
    });

    req.on("error", () => {
      resolve(false);
    });

    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  // Get API key from environment variable
  const apiKey = process.env.NF_API_KEY;
  if (!apiKey) {
    console.error("NF_API_KEY environment variable is required");
    process.exit(1);
  }

  // Get base URL from environment variable or use default
  const baseURL = process.env.NF_BASE_URL || "https://api.infactory.ai";

  // Test connection to the server
  console.log(`\n🔍 Testing connection to ${baseURL}...`);
  const isConnected = await testConnection(baseURL);

  if (!isConnected) {
    console.error(`\n❌ Cannot connect to ${baseURL}`);
    if (baseURL.includes("localhost") || baseURL.includes("127.0.0.1")) {
      console.error("   Make sure your local server is running!");
      console.error("   Try running: npm start or your local server command");
    }
    process.exit(1);
  }

  console.log(`\n✅ Successfully connected to ${baseURL}`);

  try {
    // Initialize the client
    console.log("\n🔑 Initializing Infactory client...");
    const client = new InfactoryClient({
      apiKey,
      baseURL,
    });

    // Call the list projects API
    console.log("\n📋 Fetching projects...");
    const response = await client.projects.getProjects();

    // Handle the response
    if (response.error) {
      console.error("\n❌ Error fetching projects:", response.error);
      process.exit(1);
    }

    // Display the results
    console.log("\n📊 Projects:\n");
    if (response.data && response.data.length > 0) {
      console.log(`Found ${response.data.length} projects`);
      response.data.slice(0, 5).forEach((project) => {
        console.log(`- ${project.name} (ID: ${project.id})`);
      });
      if (response.data.length > 5) {
        console.log(`... and ${response.data.length - 5} more`);
      }
    } else {
      console.log("No projects found.");
    }

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during API test:");
    if (error instanceof Error) {
      console.error("Message:", error.message);
      if ("cause" in error) {
        console.error("Cause:", error.cause);
      }
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("\n❌ Unhandled error:", error);
  process.exit(1);
});
