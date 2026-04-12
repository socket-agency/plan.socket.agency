import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { verifySession } from "@/lib/auth";
import { chatLimiter } from "@/lib/rate-limit";
import { getTools } from "@/lib/ai/tools";
import { getSystemPrompt } from "@/lib/ai/system-prompt";
import { db } from "@/db";
import { conversations, chatMessages } from "@/db/schema";
import { generateConversationTitle } from "@/lib/ai/generate-title";

// Pro plan supports up to 60s
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { success: rateLimitOk } = await chatLimiter.limit(session.userId);
  if (!rateLimitOk) {
    return new Response("Too many requests", { status: 429 });
  }

  let chatId: string;
  let messages: UIMessage[];
  try {
    const body = await request.json();
    if (!body?.id || typeof body.id !== "string" || !z.string().uuid().safeParse(body.id).success) {
      return new Response("id must be a valid UUID", { status: 400 });
    }
    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
      return new Response("messages array is required", { status: 400 });
    }
    if (body.messages.length > 100) {
      return new Response("Too many messages (max 100)", { status: 400 });
    }
    const totalSize = JSON.stringify(body.messages).length;
    if (totalSize > 200_000) {
      return new Response("Payload too large", { status: 400 });
    }

    const messageSchema = z.object({
      id: z.string().min(1),
      role: z.enum(["user", "assistant"]),
      parts: z.array(z.object({ type: z.string() }).passthrough()),
    });

    for (const m of body.messages) {
      if (!messageSchema.safeParse(m).success) {
        return new Response("Invalid message structure", { status: 400 });
      }
    }

    chatId = body.id;
    messages = body.messages;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  // Upsert conversation
  let isNewConversation = false;
  {
    const [existing] = await db
      .select({ id: conversations.id, userId: conversations.userId })
      .from(conversations)
      .where(eq(conversations.id, chatId))
      .limit(1);

    if (!existing) {
      await db.insert(conversations).values({
        id: chatId,
        userId: session.userId,
      });
      isNewConversation = true;
    } else if (existing.userId !== session.userId) {
      return new Response("Forbidden", { status: 403 });
    }

    // Diff-save incoming messages (only insert new ones)
    const incomingIds = messages.map((m) => m.id);
    const existingMessages = incomingIds.length
      ? await db
          .select({ id: chatMessages.id })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.conversationId, chatId),
              inArray(chatMessages.id, incomingIds),
            ),
          )
      : [];

    const existingIdSet = new Set(existingMessages.map((m) => m.id));
    const newMessages = messages
      .filter((m) => !existingIdSet.has(m.id))
      .filter((m) => m.role === "user" || m.role === "assistant");

    if (newMessages.length > 0) {
      await db
        .insert(chatMessages)
        .values(
          newMessages.map((m) => ({
            id: m.id,
            conversationId: chatId,
            role: m.role as "user" | "assistant" | "system",
            parts: m.parts,
          })),
        )
        .onConflictDoNothing();
    }
  }

  const result = streamText({
    model: anthropic("claude-opus-4-6"),
    system: getSystemPrompt(session.role),
    messages: await convertToModelMessages(messages),
    tools: getTools(session.role, session.userId),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ responseMessage }) => {
      try {
        // Save the assistant's response message
        await db
          .insert(chatMessages)
          .values({
            id: responseMessage.id,
            conversationId: chatId,
            role: responseMessage.role,
            parts: responseMessage.parts,
          })
          .onConflictDoNothing();

        // Update conversation timestamp
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, chatId));

        // Generate title for new conversations (fire-and-forget)
        if (isNewConversation) {
          const firstUserText =
            messages
              .find((m) => m.role === "user")
              ?.parts.find((p) => p.type === "text")?.text ?? "";

          if (firstUserText) {
            generateConversationTitle(chatId, firstUserText).catch(
              console.error,
            );
          }
        }
      } catch (error) {
        console.error("Failed to persist chat message:", error);
      }
    },
  });
}
