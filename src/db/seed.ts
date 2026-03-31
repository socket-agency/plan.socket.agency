import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hash } from "@node-rs/argon2";
import { users, tasks } from "./schema";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle({ client: sql });

  console.log("Seeding database...");

  const ownerPassword = await hash("admin123");
  const clientPassword = await hash("client123");

  const [owner] = await db
    .insert(users)
    .values({
      name: "Mykola",
      email: "admin@socket.agency",
      password: ownerPassword,
      role: "owner",
    })
    .returning();

  const [client] = await db
    .insert(users)
    .values({
      name: "Client",
      email: "client@example.com",
      password: clientPassword,
      role: "client",
    })
    .returning();

  console.log("Created users:", owner.email, client.email);

  await db.insert(tasks).values([
    {
      title: "Design homepage layout",
      description:
        "Create wireframes and mockups for the main landing page. Include hero section, features, and CTA.",
      status: "backlog",
      priority: "high",
      assignee: "agency",
      position: 1000,
      createdBy: owner.id,
    },
    {
      title: "Set up DNS records",
      description: "Configure DNS for plan.socket.agency domain.",
      status: "backlog",
      priority: "medium",
      assignee: "agency",
      position: 2000,
      createdBy: owner.id,
    },
    {
      title: "Decide on brand colors",
      description:
        "Review the color palette options and pick the final brand colors for the project.",
      status: "todo",
      priority: "medium",
      assignee: "client",
      position: 1000,
      createdBy: owner.id,
    },
    {
      title: "Build REST API",
      description:
        "Implement the core API endpoints for task CRUD operations with authentication.",
      status: "in_progress",
      priority: "urgent",
      assignee: "agency",
      position: 1000,
      createdBy: owner.id,
    },
    {
      title: "Review API documentation",
      description:
        "Review the API docs and provide feedback on the endpoint structure.",
      status: "in_review",
      priority: "low",
      assignee: "client",
      position: 1000,
      createdBy: owner.id,
    },
    {
      title: "Deploy staging environment",
      description: "Set up Vercel project and deploy the staging build.",
      status: "done",
      priority: "high",
      assignee: "agency",
      position: 1000,
      createdBy: owner.id,
    },
  ]);

  console.log("Created 6 sample tasks");
  console.log("Seed complete!");
}

seed().catch(console.error);
