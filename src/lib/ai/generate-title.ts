import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";

export async function generateConversationTitle(
  conversationId: string,
  userMessage: string,
) {
  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system:
      "Generate a short (3-6 word) title summarizing what the user is asking about. Return ONLY the title, no quotes or punctuation.",
    prompt: userMessage,
  });

  await db
    .update(conversations)
    .set({ title: text.trim() })
    .where(eq(conversations.id, conversationId));
}
