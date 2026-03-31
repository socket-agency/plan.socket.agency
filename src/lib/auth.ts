import { SignJWT, jwtVerify } from "jose";
import { hash, verify } from "@node-rs/argon2";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, type User, type UserRole } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);
const COOKIE_NAME = "session";

export interface SessionPayload {
  userId: string;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(
  hashed: string,
  password: string
): Promise<boolean> {
  return verify(hashed, password);
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    role: user.role,
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
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await verifySession();
  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user ?? null;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
