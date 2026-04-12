import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, DEFAULT_NOTIFICATION_PREFS } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword, createSession } from "@/lib/auth";
import { loginLimiter } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  // Rate limit by email
  const { success: rateLimitOk } = await loginLimiter.limit(email);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    // Run a dummy hash to equalize response timing with the "wrong password" path
    await hashPassword("timing-equalization-dummy");
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(user.password, password);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  await createSession(user);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      notificationPrefs:
        user.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS[user.role],
    },
  });
}
