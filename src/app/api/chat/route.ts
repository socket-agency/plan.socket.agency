import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { verifySession } from "@/lib/auth";
import { getTools } from "@/lib/ai/tools";
import { getSystemPrompt } from "@/lib/ai/system-prompt";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: UIMessage[];
  try {
    const body = await request.json();
    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
      return new Response("messages array is required", { status: 400 });
    }
    messages = body.messages;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const result = streamText({
    model: anthropic("claude-opus-4-6"),
    system: getSystemPrompt(session.role),
    messages: await convertToModelMessages(messages),
    tools: getTools(session.role, session.userId),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
