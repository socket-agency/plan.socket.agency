import { NextResponse } from "next/server";
import { verifySession, type SessionPayload } from "@/lib/auth";

export async function requireAuth(): Promise<
  | { session: SessionPayload; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await verifySession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session };
}

export async function requireOwner(): Promise<
  | { session: SessionPayload; error?: never }
  | { session?: never; error: NextResponse }
> {
  const result = await requireAuth();
  if (result.error) return result;

  if (result.session.role !== "owner") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
