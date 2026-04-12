import { SignJWT, jwtVerify } from "jose";
import { hash, verify } from "@node-rs/argon2";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, type User, type UserRole, type SafeUser } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { env } from "@/lib/env";

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const COOKIE_NAME = "session";

export interface SessionPayload {
  userId: string;
  role: UserRole;
  tokenVersion: number;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 1,
    algorithm: 2, // Argon2id
  });
}

export async function verifyPassword(
  hashed: string,
  password: string
): Promise<boolean> {
  return verify(hashed, password);
}

export async function createSession(
  user: Pick<User, "id" | "role" | "tokenVersion">
): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return token;
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const session = payload as unknown as SessionPayload;

    // Check tokenVersion against DB and exclude soft-deleted users
    const [user] = await db
      .select({ tokenVersion: users.tokenVersion })
      .from(users)
      .where(and(eq(users.id, session.userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!user || user.tokenVersion !== session.tokenVersion) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await verifySession();
  if (!session) return null;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      notificationPrefs: users.notificationPrefs,
      lastDigestSentAt: users.lastDigestSentAt,
      tokenVersion: users.tokenVersion,
      createdAt: users.createdAt,
      isDeleted: users.isDeleted,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user ?? null;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ tokenVersion: sql`token_version + 1` })
    .where(eq(users.id, userId));
}
