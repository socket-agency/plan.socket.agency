import { db } from "@/db";
import { tasks } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ListClient } from "./list-client";

export default async function ListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.position));

  return <ListClient tasks={allTasks} isOwner={user.role === "owner"} />;
}
