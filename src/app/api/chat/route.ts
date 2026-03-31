import { anthropic } from "@ai-sdk/anthropic";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { verifySession } from "@/lib/auth";
import { getTools } from "@/lib/ai/tools";
import { getSystemPrompt } from "@/lib/ai/system-prompt";

export const maxDuration = 30;

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: UIMessage[];
  try {
    const body = await request.json();
    messages = body.messages;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: getSystemPrompt(session.role),
    messages: await convertToModelMessages(messages),
    tools: getTools(session.role, session.userId),
  });

  return result.toUIMessageStreamResponse();
}
