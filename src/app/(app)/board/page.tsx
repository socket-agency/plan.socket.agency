import { db } from "@/db";
import { tasks } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BoardClient } from "./board-client";

export default async function BoardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.position));

  return <BoardClient tasks={allTasks} isOwner={user.role === "owner"} />;
}
