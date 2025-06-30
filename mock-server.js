const http = require("http");

const server = http.createServer((req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`);

  // Set CORS headers to allow requests from any origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Basic mock responses
  if (req.url.includes("/users/me")) {
    // Mock current user endpoint
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "mock-user-id",
        name: "Mock User",
        email: "mock@example.com",
      }),
    );
  } else if (req.url.includes("/projects")) {
    // Mock projects endpoint
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify([
        { id: "mock-project-1", name: "Mock Project 1" },
        { id: "mock-project-2", name: "Mock Project 2" },
      ]),
    );
  } else {
    // Generic response for other endpoints
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Mock response", path: req.url }));
  }
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Mock server running at http://localhost:${PORT}`);
});
