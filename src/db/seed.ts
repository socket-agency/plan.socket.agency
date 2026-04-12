import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hash } from "@node-rs/argon2";
import { users, tasks } from "./schema";

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error("ERROR: Seed script must not run in production.");
    process.exit(1);
  }

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
    // Backlog
    {
      title: "Add dark/light theme toggle",
      description: "Let users switch between dark and light mode. Persist preference in localStorage.",
      status: "backlog",
      priority: "low",
      assignee: "agency",
      position: 1000,
      createdBy: owner.id,
    },
    {
      title: "Email notifications for task updates",
      description: "Send an email when a task assigned to the client changes status.",
      status: "backlog",
      priority: "medium",
      assignee: "agency",
      position: 2000,
      createdBy: owner.id,
    },
    {
      title: "Export board to PDF",
      description: "Generate a printable PDF report of all tasks grouped by status.",
      status: "backlog",
      priority: "low",
      assignee: "agency",
      position: 3000,
      createdBy: owner.id,
    },
    {
      title: "Add search and filter to board",
      description: "Filter tasks by priority, assignee, or keyword. Use cmdk for the search palette.",
      status: "backlog",
      priority: "medium",
      assignee: "agency",
      position: 4000,
      createdBy: owner.id,
    },
    {
      title: "Provide final copy for About page",
      description: "Draft the About page text — company story, team bios, and mission statement.",
      status: "backlog",
      priority: "medium",
      assignee: "client",
      position: 5000,
      createdBy: owner.id,
    },
    // To Do
    {
      title: "Design homepage hero section",
      description: "Create wireframes and mockups for the landing page hero. Include headline, subtext, and CTA button.",
      status: "todo",
      priority: "high",
      assignee: "agency",
      position: 1000,
      createdBy: owner.id,
    },
    {
      title: "Decide on brand colors",
      description: "Review the color palette options and finalize brand colors for the project.",
      status: "todo",
      priority: "medium",
      assignee: "client",
      position: 2000,
      createdBy: owner.id,
    },
    {
      title: "Set up DNS records",
      description: "Configure DNS A and CNAME records for the production domain.",
      status: "todo",
      priority: "medium",
      assignee: "agency",
      position: 3000,
      createdBy: owner.id,
    },
    {
      title: "Write API documentation",
      description: "Document all REST endpoints with request/response examples using OpenAPI spec.",
      status: "todo",
      priority: "medium",
      assignee: "agency",
      position: 4000,
      createdBy: owner.id,
    },
    // In Progress
    {
      title: "Build REST API for tasks",
      description: "Implement CRUD endpoints for tasks with authentication and role-based access control.",
      status: "in_progress",
      priority: "urgent",
      assignee: "agency",
      position: 1000,
      createdBy: owner.id,
    },
    {
      title: "Implement drag-and-drop board",
      description: "Wire up @dnd-kit for task reordering and cross-column moves. Persist position changes to the database.",
      status: "in_progress",
      priority: "high",
      assignee: "agency",
      position: 2000,
      createdBy: owner.id,
    },
    {
      title: "Gather product photos for catalog",
      description: "Collect and organize high-res product images for the initial catalog launch.",
      status: "in_progress",
      priority: "high",
      assignee: "client",
      position: 3000,
      createdBy: owner.id,
    },
    // In Review
    {
      title: "Review login page design",
      description: "Check the login page mockup for branding consistency and approve or request changes.",
      status: "in_review",
      priority: "medium",
      assignee: "client",
      position: 1000,
      createdBy: owner.id,
    },
    {
      title: "Test file upload flow",
      description: "Verify that file attachments upload correctly, display thumbnails, and can be downloaded.",
      status: "in_review",
      priority: "high",
      assignee: "agency",
      position: 2000,
      createdBy: owner.id,
    },
    // Done
    {
      title: "Deploy staging environment",
      description: "Set up Vercel project and deploy the staging build with environment variables.",
      status: "done",
      priority: "high",
      assignee: "agency",
      position: 1000,
      createdBy: owner.id,
    },
    {
      title: "Set up database and migrations",
      description: "Provision Neon Postgres, configure Drizzle ORM, and run initial schema migration.",
      status: "done",
      priority: "urgent",
      assignee: "agency",
      position: 2000,
      createdBy: owner.id,
    },
    {
      title: "Configure authentication",
      description: "Implement password-based auth with Argon2id hashing and JWT session cookies.",
      status: "done",
      priority: "urgent",
      assignee: "agency",
      position: 3000,
      createdBy: owner.id,
    },
    {
      title: "Approve project scope",
      description: "Review and sign off on the initial feature list and timeline.",
      status: "done",
      priority: "high",
      assignee: "client",
      position: 4000,
      createdBy: owner.id,
    },
  ]);

  console.log("Created 18 sample tasks");
  console.log("Seed complete!");
}

seed().catch(console.error);
