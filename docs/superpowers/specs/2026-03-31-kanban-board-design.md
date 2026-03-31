# plan.socket.agency — Kanban Board MVP Design

## Context

Solo agency owner needs a task management tool that serves two purposes:
1. **Owner view** — full kanban board with task management and AI assistant for managing tasks, summarizing progress, and generating reports.
2. **Client view** — same board/list/detail views but read-only, with an AI chat for asking questions about task status and progress.

Currently one client. The tool lives at `plan.socket.agency`.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | shadcn/ui + Tailwind CSS (dark mode) |
| Database | Vercel Postgres (Neon) |
| ORM | Drizzle ORM |
| Auth | Password-based, JWT session cookie |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| AI Chat | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — Claude |
| Deployment | Vercel |

## Data Model

### `users`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, `gen_random_uuid()` |
| name | text | Display name |
| email | text | Unique, used for login |
| password | text | Argon2id hashed |
| role | text | `"owner"` or `"client"` |
| created_at | timestamp | Default `now()` |

### `tasks`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, `gen_random_uuid()` |
| title | text | Required |
| description | text | Markdown content, nullable |
| status | text | `"backlog"` / `"todo"` / `"in_progress"` / `"in_review"` / `"done"` |
| priority | text | `"low"` / `"medium"` / `"high"` / `"urgent"` |
| assignee | text | `"agency"` or `"client"` |
| position | integer | Ordering within a column (use gaps: 1000, 2000, 3000) |
| due_date | date | Nullable |
| created_by | uuid | FK → users.id |
| created_at | timestamp | Default `now()` |
| updated_at | timestamp | Auto-updated |

Two tables only. No projects, workspaces, or labels for the MVP.

## Architecture

### Approach: Single app, role-based middleware

One Next.js app with shared routes. Middleware reads the JWT session cookie and attaches `user` context. Components check `user.role` to conditionally render write actions.

- Owner sees all controls: drag-and-drop, create/edit/delete buttons, settings
- Client sees the same views with write controls hidden and drag disabled

### Layout: Sidebar + Content

Left sidebar with:
- Logo / app name
- Navigation: Board, List, Settings (owner-only)
- AI Chat button at the bottom
- User info / logout

Main content area on the right renders the active view.

## Routes

### Pages

| Route | Description | Access |
|---|---|---|
| `/login` | Password login form | Public |
| `/` | Redirect to `/board` | Authenticated |
| `/board` | Kanban board view | Owner + Client |
| `/list` | Table/list view | Owner + Client |
| `/tasks/[id]` | Task detail page | Owner + Client |
| `/settings` | User management | Owner only |

### API Routes

| Method | Route | Description | Access |
|---|---|---|---|
| POST | `/api/auth/login` | Authenticate, set cookie | Public |
| POST | `/api/auth/logout` | Clear session | Authenticated |
| GET | `/api/tasks` | List tasks (with filters) | Authenticated |
| POST | `/api/tasks` | Create task | Owner |
| PATCH | `/api/tasks/[id]` | Update task | Owner |
| DELETE | `/api/tasks/[id]` | Delete task | Owner |
| PATCH | `/api/tasks/reorder` | Batch update positions | Owner |
| POST | `/api/chat` | AI chat (streaming) | Authenticated |

## Auth Flow

1. Owner seeds accounts via a seed script or `/settings` page
2. `/login` accepts email + password → validates → sets HTTP-only JWT cookie (`{ userId, role, exp }`)
3. Middleware on all protected routes reads cookie, rejects if invalid/expired
4. Server Components receive user context via cookie — check role for conditional rendering
5. API routes validate JWT and check role — return 403 for unauthorized mutations
6. No signup page, no password reset for the MVP

## AI Chat

### Architecture

- **Provider**: Anthropic Claude via `@ai-sdk/anthropic`
- **SDK**: Vercel AI SDK (`ai` package) for streaming + tool use
- **Endpoint**: `POST /api/chat` — receives conversation messages, streams response
- **System prompt**: Includes user role, current date, and task context
- **Conversation storage**: In-memory per session (no DB persistence for MVP)

### Tools by Role

| Tool | Owner | Client | Description |
|---|---|---|---|
| `listTasks` | Yes | Yes | List/filter/search tasks |
| `getTask` | Yes | Yes | Get task details by ID |
| `getStatusSummary` | Yes | Yes | Summary: counts per status, overdue, etc. |
| `createTask` | Yes | No | Create a new task |
| `updateTask` | Yes | No | Update task fields |
| `deleteTask` | Yes | No | Delete a task |
| `generateReport` | Yes | No | Generate a progress/status report |

### UI

- Chat icon button in the sidebar (bottom)
- Click opens a slide-out drawer from the right (~400px wide)
- Standard chat interface: scrollable message list + input at bottom
- Tool call results rendered inline (e.g., "Created task: Design homepage")
- Markdown rendering for AI responses

## Key Interactions

### Kanban Board
- Columns: Backlog → To Do → In Progress → In Review → Done
- Cards show: title, priority badge, assignee badge, due date (if set)
- Owner: drag cards between columns or reorder within. On drop → `PATCH /api/tasks/reorder`
- Client: drag disabled, view-only
- Click card → navigate to `/tasks/[id]`

### Task Creation
- Owner clicks "+ New Task" button (top of board or in a column)
- Dialog opens with form: title, description (markdown editor), priority, assignee, status, due date
- Submit → `POST /api/tasks` → card appears in the correct column

### Task Detail Page (`/tasks/[id]`)
- Owner: editable form with save button
- Client: read-only view of all fields
- Description rendered as markdown

### List View
- shadcn DataTable with columns: title, status, priority, assignee, due date, created
- Sortable and filterable by any column
- Owner: row click → navigate to detail page for editing
- Client: row click → navigate to detail page (read-only)

## Verification

1. **Auth**: Login as owner → verify full CRUD. Login as client → verify read-only (no create/edit/delete buttons, drag disabled, API returns 403 on mutations)
2. **Kanban**: Create tasks, drag between columns, verify position persistence on page reload
3. **List view**: Verify sorting, filtering, navigation to detail pages
4. **AI chat (owner)**: Ask to create a task → verify it appears on the board. Ask for a status summary.
5. **AI chat (client)**: Ask about task status → verify answer. Try to ask AI to create a task → verify refusal.
6. **Responsive**: Test sidebar collapse on smaller screens
