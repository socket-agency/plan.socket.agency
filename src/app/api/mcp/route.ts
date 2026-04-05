import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";
import { verifyApiKey } from "@/lib/mcp/auth";

async function handleMcpRequest(request: Request): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Unauthorized: missing Bearer token" },
        id: null,
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const keyInfo = await verifyApiKey(token);
  if (!keyInfo) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Unauthorized: invalid API key" },
        id: null,
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport();

  await server.connect(transport);

  return transport.handleRequest(request, {
    authInfo: {
      token,
      clientId: keyInfo.userId,
      scopes: [keyInfo.role],
      extra: { role: keyInfo.role, userId: keyInfo.userId },
    },
  });
}

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}
