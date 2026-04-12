@AGENTS.md

---
description: Project-level instructions for plan.socket.agency
alwaysApply: true
---

> **MANDATORY: Read `AGENTS.md` before writing ANY code.** This project uses a Next.js version with breaking changes from training data. APIs, conventions, and file structure differ. Always consult `node_modules/next/dist/docs/` for the actual behavior. Skipping this has caused critical misdiagnoses (e.g., `proxy.ts` mistaken for dead code).

# plan.socket.agency

## Overview
Kanban board / task management tool for Socket Agency. Two user types: owner (full CRUD + AI assistant) and client (read-only + AI Q&A).

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS (dark mode)
- **Database**: Vercel Postgres (Neon) + Drizzle ORM
- **Auth**: Password-based, Argon2id hashing, JWT session cookies
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable
- **AI Chat**: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — Claude
- **Runtime**: Bun
- **Deployment**: Vercel

## Architecture Decisions
- Single app with role-based proxy (no separate client portal)
- Sidebar layout with content area
- Task positions use integer gaps (1000, 2000, ...) for efficient reordering
- AI chat tools are role-gated: owner gets full CRUD, client gets read-only

## Key Patterns
- Route group `(app)` wraps all authenticated pages
- `src/proxy.ts` — centralized auth proxy (Next.js 16 renamed middleware → proxy)
- `src/lib/auth.ts` for JWT session management
- `src/lib/api-auth.ts` has `requireAuth()` and `requireOwner()` helpers for API routes
- Drizzle schema with TypeScript enums for status, priority, assignee, role
- Server Components fetch data; Client Components handle interactivity

## Commands
- `bun dev` — Start dev server
- `bunx drizzle-kit generate` — Generate migrations
- `bunx drizzle-kit migrate` — Run migrations
- `bun run src/db/seed.ts` — Seed database

## Environment Variables
- `DATABASE_URL` — Neon Postgres connection string
- `JWT_SECRET` — Secret for signing JWTs
- `ANTHROPIC_API_KEY` — For AI chat
