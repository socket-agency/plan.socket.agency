# plan.socket.agency

**A self-hosted kanban board with a built-in AI assistant.** Manage tasks, collaborate with clients, and let Claude handle the busywork — creating tasks, generating reports, and answering questions about project progress.

Built for agencies and freelancers who need a simple, opinionated project board with clear owner/client boundaries.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/socket-agency/plan.socket.agency&env=DATABASE_URL,JWT_SECRET,ANTHROPIC_API_KEY,BLOB_READ_WRITE_TOKEN)

<!-- Add a screenshot: save as docs/screenshot.png -->
<!-- ![Board](docs/screenshot.png) -->

## Features

- **Kanban board** — drag-and-drop tasks across Backlog, To Do, In Progress, In Review, and Done
- **AI assistant (Claude)** — ask questions about progress, create/update tasks, generate project reports — all through natural language
- **Role-based access** — owners get full control; clients can view the board, leave comments, and request tasks
- **Persistent chat history** — conversations are saved per user with auto-generated titles
- **Comments & file attachments** — collaborate directly on tasks with threaded comments and uploaded files
- **Task metadata** — priorities (low / medium / high / urgent), assignees (agency / client), due dates with overdue tracking
- **User management** — create and manage accounts with role assignment
- **Dark theme** — because it's 2026

## Owner vs Client

| | Owner | Client |
|---|:---:|:---:|
| View board | ✓ | ✓ |
| Create tasks | ✓ (any column) | ✓ (backlog only) |
| Edit / delete tasks | ✓ | — |
| Drag & drop | ✓ | — |
| Comments & attachments | ✓ | ✓ |
| AI: create / update / delete tasks | ✓ | — |
| AI: ask questions & view reports | ✓ | ✓ |
| Manage users | ✓ | — |

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| UI | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/) |
| Database | PostgreSQL ([Neon](https://neon.tech/)) + [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | Password-based, Argon2id hashing, JWT session cookies |
| Drag & drop | [@dnd-kit](https://dndkit.com/) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/) + [Claude](https://www.anthropic.com/) (tool use) |
| File storage | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) |
| Runtime | [Bun](https://bun.sh/) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [just](https://github.com/casey/just) (`brew install just`) — optional but recommended
- A PostgreSQL database ([Neon](https://neon.tech/) free tier works)
- An [Anthropic API key](https://console.anthropic.com/)
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store token

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 characters) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |

### 3. Run migrations

```bash
bunx drizzle-kit migrate
```

### 4. Seed the database (optional)

Creates sample users and tasks to get started quickly.

```bash
bun run src/db/seed.ts
```

Default credentials after seeding:

| Role | Email | Password |
|------|-------|----------|
| Owner | `admin@socket.agency` | `admin123` |
| Client | `client@example.com` | `client123` |

### 5. Start the dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

With [just](https://github.com/casey/just) (auto-loads `.env.local`):

| Command | Description |
|---------|-------------|
| `just dev` | Start dev server |
| `just build` | Production build |
| `just lint` | Run ESLint |
| `just db-generate` | Generate migrations from schema changes |
| `just db-migrate` | Apply pending migrations |
| `just db-seed` | Seed database with sample data |
| `just db-studio` | Open Drizzle Studio (DB browser) |

<details>
<summary>Without <code>just</code></summary>

You'll need to load `.env.local` yourself for DB commands.

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server |
| `bun run build` | Production build |
| `bun run lint` | Run ESLint |
| `bunx drizzle-kit generate` | Generate migrations from schema changes |
| `bunx drizzle-kit migrate` | Apply pending migrations |
| `bun run src/db/seed.ts` | Seed database with sample data |
| `bunx drizzle-kit studio` | Open Drizzle Studio (DB browser) |

</details>

## Deployment

### Vercel (easiest)

Click the **Deploy with Vercel** button at the top, or:

1. Push to GitHub
2. Import in the [Vercel dashboard](https://vercel.com/new)
3. Add environment variables from `.env.example`
4. Deploy — Vercel auto-detects Next.js

Run migrations against your production database:

```bash
DATABASE_URL="your-prod-url" bunx drizzle-kit migrate
```

Or add to your Vercel build command: `bunx drizzle-kit migrate && next build`

### Self-hosting (VPS / Docker / bare metal)

The app is a standard Next.js project — it runs anywhere Node or Bun runs.

**1. Build the standalone output:**

```bash
bun install
bun run build
```

Next.js produces a `.next/standalone` directory with everything needed to run the server. Copy `.next/static` into `.next/standalone/.next/static` and `public` into `.next/standalone/public`:

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

> **Note:** You need to enable standalone output first. Add `output: "standalone"` to `next.config.ts`.

**2. Run the server:**

```bash
DATABASE_URL="postgres://..." \
JWT_SECRET="your-secret" \
ANTHROPIC_API_KEY="sk-ant-..." \
BLOB_READ_WRITE_TOKEN="..." \
node .next/standalone/server.js
```

The server starts on port 3000 by default. Set `PORT` to change it.

**3. Database:**

Any PostgreSQL instance works — [Neon](https://neon.tech/), [Supabase](https://supabase.com/), a local `postgres` container, or a managed instance on your cloud provider. Run migrations before starting the server:

```bash
DATABASE_URL="your-prod-url" bunx drizzle-kit migrate
```

**4. File storage:**

File attachments use Vercel Blob by default. For self-hosted setups, you can either:
- Use Vercel Blob as a standalone service (works outside Vercel hosting)
- Swap the storage layer in `src/app/api/tasks/[id]/attachments/` to use S3, local disk, or another provider

**5. Reverse proxy:**

Put the app behind nginx, Caddy, or similar for SSL termination:

```nginx
server {
    server_name plan.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Use a process manager like `pm2` or `systemd` to keep the server running.

## License

[MIT](LICENSE)
