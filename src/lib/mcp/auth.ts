import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/db/schema";

export interface ApiKeyInfo {
  userId: string;
  role: UserRole;
  keyId: string;
}

async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateApiKey(): Promise<{
  raw: string;
  hash: string;
  prefix: string;
}> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const raw = `sk_live_${base64}`;
  const hash = await sha256(raw);
  const prefix = raw.slice(0, 16);
  return { raw, hash, prefix };
}

export async function verifyApiKey(
  token: string
): Promise<ApiKeyInfo | null> {
  const hash = await sha256(token);

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  if (!key) return null;

  if (key.expiresAt && key.expiresAt < new Date()) return null;

  // Update lastUsedAt (fire-and-forget, don't block the response)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .then(() => {})
    .catch(() => {});

  return {
    userId: key.userId,
    role: key.role as UserRole,
    keyId: key.id,
  };
}
