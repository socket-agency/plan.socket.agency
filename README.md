# plan.socket.agency

Kanban board and task management tool with AI assistant. Two user roles: **owner** (full CRUD + AI assistant) and **client** (read-only + AI Q&A).

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** shadcn/ui + Tailwind CSS (dark mode)
- **Database:** PostgreSQL (Neon) + Drizzle ORM
- **Auth:** Password-based, Argon2id hashing, JWT session cookies
- **Drag & Drop:** @dnd-kit
- **AI Chat:** Vercel AI SDK + Claude (with persistent conversations)
- **File Storage:** Vercel Blob
- **Runtime:** Bun

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- A [Neon](https://neon.tech/) PostgreSQL database (or any Postgres with connection string)
- An [Anthropic API key](https://console.anthropic.com/) (for the AI chat)
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store token (for file attachments)

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 characters) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |

### 3. Run database migrations

```bash
bunx drizzle-kit migrate
```

### 4. Seed the database (optional)

Creates an owner user, a client user, and sample tasks.

Default login credentials after seeding:

| Role | Email | Password |
|------|-------|----------|
| Owner | `admin@socket.agency` | `admin123` |
| Client | `client@example.com` | `client123` |

```bash
bun run src/db/seed.ts
```

### 5. Start the dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push this repo to GitHub
2. Import the repo in the [Vercel dashboard](https://vercel.com/new)
3. Add the environment variables from `.env.example` in Vercel project settings
4. Vercel auto-detects Next.js — deploy

Migrations need to run against your production database. Either:
- Run `DATABASE_URL="your-prod-url" bunx drizzle-kit migrate` locally
- Or add a build command in Vercel: `bunx drizzle-kit migrate && next build`

## Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server |
| `bun run build` | Production build |
| `bun run lint` | Run ESLint |
| `bunx drizzle-kit generate` | Generate migrations from schema changes |
| `bunx drizzle-kit migrate` | Apply pending migrations |
| `bunx drizzle-kit studio` | Open Drizzle Studio (DB browser) |
| `bun run src/db/seed.ts` | Seed database with sample data |
